-- ============================================================================
-- LunchLoop: Canteen Pre-Order and Peak-Hour Queue Management
-- Migration 004: Atomic Transactional Functions (RPCs)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATOMIC ORDER CREATION
-- Handles inventory reservation, window capacity check, pricing verification,
-- snapshot capture, and event logging within a single isolated transaction.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_user_id UUID,
    p_pickup_window_id UUID,
    p_items JSONB,              -- Array of { "menu_item_id": "uuid", "quantity": int }
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_public_order_number TEXT;
    v_pickup_token TEXT;
    v_window RECORD;
    v_item RECORD;
    v_req_item JSONB;
    v_menu_item_id UUID;
    v_requested_qty INT;
    v_calculated_subtotal NUMERIC(10, 2) := 0.00;
    v_line_total NUMERIC(10, 2);
    v_existing_order RECORD;
    v_token_number INT;
BEGIN
    -- Idempotency check: return existing order if previously created
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_order FROM public.orders WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object(
                'order_id', v_existing_order.id,
                'public_order_number', v_existing_order.public_order_number,
                'pickup_token', v_existing_order.pickup_token,
                'status', v_existing_order.status,
                'subtotal', v_existing_order.subtotal,
                'is_idempotent_replay', true
            );
        END IF;
    END IF;

    -- Validate input items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'ORDER_EMPTY: Order must contain at least one item.'
            USING ERRCODE = 'P0001';
    END IF;

    -- Lock and validate pickup window
    SELECT * INTO v_window
    FROM public.pickup_windows
    WHERE id = p_pickup_window_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'WINDOW_NOT_FOUND: Selected pickup window does not exist.'
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_window.is_active THEN
        RAISE EXCEPTION 'WINDOW_INACTIVE: Selected pickup window is currently not active.'
            USING ERRCODE = 'P0003';
    END IF;

    IF v_window.starts_at < timezone('utc'::text, now()) - INTERVAL '5 minutes' THEN
        RAISE EXCEPTION 'WINDOW_EXPIRED: Pickup window has already passed.'
            USING ERRCODE = 'P0004';
    END IF;

    IF v_window.reserved_count >= v_window.capacity THEN
        RAISE EXCEPTION 'WINDOW_CAPACITY_EXCEEDED: This pickup window is fully booked.'
            USING ERRCODE = 'P0005';
    END IF;

    -- Generate human-friendly identifiers
    v_public_order_number := 'LL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 6));
    
    -- Generate sequential window pickup token (e.g. T-101)
    v_token_number := 101 + (v_window.reserved_count % 900);
    v_pickup_token := 'T-' || lpad(v_token_number::text, 3, '0');

    -- Create order record
    INSERT INTO public.orders (
        public_order_number,
        pickup_token,
        user_id,
        pickup_window_id,
        status,
        subtotal,
        notes,
        idempotency_key
    ) VALUES (
        v_public_order_number,
        v_pickup_token,
        p_user_id,
        p_pickup_window_id,
        'confirmed',
        0.00, -- will update after items computed
        p_notes,
        p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- Increment window reservation count atomically
    UPDATE public.pickup_windows
    SET reserved_count = reserved_count + 1
    WHERE id = p_pickup_window_id;

    -- Iterate and validate requested items
    FOR v_req_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_menu_item_id := (v_req_item->>'menu_item_id')::UUID;
        v_requested_qty := (v_req_item->>'quantity')::INT;

        IF v_requested_qty <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Requested quantity must be greater than zero.'
                USING ERRCODE = 'P0006';
        END IF;

        IF v_requested_qty > 10 THEN
            RAISE EXCEPTION 'QUANTITY_LIMIT_EXCEEDED: Maximum 10 units per item allowed in pre-orders.'
                USING ERRCODE = 'P0007';
        END IF;

        -- Lock menu item row for update to prevent overselling race conditions
        SELECT * INTO v_item
        FROM public.menu_items
        WHERE id = v_menu_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'ITEM_NOT_FOUND: Menu item % not found.', v_menu_item_id
                USING ERRCODE = 'P0008';
        END IF;

        IF NOT v_item.is_available THEN
            RAISE EXCEPTION 'ITEM_UNAVAILABLE: "%" is currently marked unavailable.', v_item.name
                USING ERRCODE = 'P0009';
        END IF;

        IF v_item.available_quantity < v_requested_qty THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % portions of "%" available (requested %).', 
                v_item.available_quantity, v_item.name, v_requested_qty
                USING ERRCODE = 'P0010';
        END IF;

        -- Calculate line total using official DB price snapshot
        v_line_total := round(v_item.price * v_requested_qty, 2);
        v_calculated_subtotal := v_calculated_subtotal + v_line_total;

        -- Deduct inventory
        UPDATE public.menu_items
        SET available_quantity = available_quantity - v_requested_qty,
            is_available = CASE WHEN (available_quantity - v_requested_qty) <= 0 THEN false ELSE is_available END
        WHERE id = v_menu_item_id;

        -- Snapshot line item
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name_snapshot,
            unit_price_snapshot,
            quantity,
            line_total
        ) VALUES (
            v_order_id,
            v_menu_item_id,
            v_item.name,
            v_item.price,
            v_requested_qty,
            v_line_total
        );

        -- Audit inventory deduction
        INSERT INTO public.inventory_events (
            menu_item_id,
            order_id,
            actor_id,
            quantity_delta,
            event_type,
            reason
        ) VALUES (
            v_menu_item_id,
            v_order_id,
            p_user_id,
            -v_requested_qty,
            'order_reservation',
            'Pre-order reservation for order ' || v_public_order_number
        );
    END LOOP;

    -- Update final subtotal on order header
    UPDATE public.orders
    SET subtotal = v_calculated_subtotal
    WHERE id = v_order_id;

    -- Record initial order status event
    INSERT INTO public.order_status_events (
        order_id,
        previous_status,
        new_status,
        actor_id,
        note
    ) VALUES (
        v_order_id,
        NULL,
        'confirmed',
        p_user_id,
        'Order placed successfully and confirmed.'
    );

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'public_order_number', v_public_order_number,
        'pickup_token', v_pickup_token,
        'status', 'confirmed',
        'subtotal', v_calculated_subtotal,
        'pickup_window_id', p_pickup_window_id,
        'is_idempotent_replay', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 2. ATOMIC ORDER CANCELLATION
-- Safely checks cancellation cutoff, releases pickup slot, restores stock
-- exactly once, and logs inventory and status audit events.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
    p_order_id UUID,
    p_actor_id UUID,
    p_reason TEXT DEFAULT 'Student requested cancellation',
    p_cutoff_minutes INT DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_window RECORD;
    v_item RECORD;
    v_actor_profile RECORD;
    v_is_staff_or_admin BOOLEAN := false;
    v_cutoff_timestamp TIMESTAMPTZ;
BEGIN
    -- Lock order for update
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.'
            USING ERRCODE = 'P0011';
    END IF;

    -- Idempotent check: if already cancelled, return success without double restock
    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'order_id', v_order.id,
            'status', 'cancelled',
            'already_cancelled', true,
            'message', 'Order was already cancelled.'
        );
    END IF;

    -- Check actor permissions
    SELECT * INTO v_actor_profile FROM public.profiles WHERE id = p_actor_id;
    IF FOUND AND v_actor_profile.role IN ('staff', 'admin') THEN
        v_is_staff_or_admin := true;
    END IF;

    IF NOT v_is_staff_or_admin AND v_order.user_id <> p_actor_id THEN
        RAISE EXCEPTION 'FORBIDDEN: You do not have permission to cancel this order.'
            USING ERRCODE = 'P0012';
    END IF;

    -- Only confirmed orders can be cancelled by students
    IF v_order.status NOT IN ('confirmed') AND NOT v_is_staff_or_admin THEN
        RAISE EXCEPTION 'CANNOT_CANCEL: Order has already entered kitchen preparation (%) and cannot be cancelled.', v_order.status
            USING ERRCODE = 'P0013';
    END IF;

    IF v_order.status IN ('ready', 'collected') THEN
        RAISE EXCEPTION 'CANNOT_CANCEL: Finished or collected orders cannot be cancelled.'
            USING ERRCODE = 'P0014';
    END IF;

    -- Enforce cancellation cutoff window for students
    SELECT * INTO v_window FROM public.pickup_windows WHERE id = v_order.pickup_window_id FOR UPDATE;
    IF FOUND AND NOT v_is_staff_or_admin THEN
        v_cutoff_timestamp := v_window.starts_at - (p_cutoff_minutes || ' minutes')::INTERVAL;
        IF timezone('utc'::text, now()) > v_cutoff_timestamp THEN
            RAISE EXCEPTION 'CUTOFF_EXCEEDED: Cancellation cutoff (% minutes before pickup) has passed.', p_cutoff_minutes
                USING ERRCODE = 'P0015';
        END IF;
    END IF;

    -- Update order status
    UPDATE public.orders
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- Decrement window capacity reservation safely
    IF FOUND THEN
        UPDATE public.pickup_windows
        SET reserved_count = GREATEST(0, reserved_count - 1)
        WHERE id = v_order.pickup_window_id;
    END IF;

    -- Restore inventory for each line item exactly once
    FOR v_item IN (SELECT * FROM public.order_items WHERE order_id = p_order_id)
    LOOP
        UPDATE public.menu_items
        SET available_quantity = available_quantity + v_item.quantity,
            is_available = true
        WHERE id = v_item.menu_item_id;

        INSERT INTO public.inventory_events (
            menu_item_id,
            order_id,
            actor_id,
            quantity_delta,
            event_type,
            reason
        ) VALUES (
            v_item.menu_item_id,
            p_order_id,
            p_actor_id,
            v_item.quantity,
            'order_cancellation',
            'Restored inventory from cancelled order ' || v_order.public_order_number
        );
    END LOOP;

    -- Record status event
    INSERT INTO public.order_status_events (
        order_id,
        previous_status,
        new_status,
        actor_id,
        note
    ) VALUES (
        p_order_id,
        v_order.status,
        'cancelled',
        p_actor_id,
        'Order cancelled: ' || COALESCE(p_reason, 'No reason specified')
    );

    RETURN jsonb_build_object(
        'order_id', v_order.id,
        'status', 'cancelled',
        'cancelled_at', timezone('utc'::text, now()),
        'already_cancelled', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 3. ATOMIC ORDER STATUS TRANSITION
-- Enforces valid state machine: confirmed -> preparing -> ready -> collected
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
    p_order_id UUID,
    p_new_status TEXT,
    p_actor_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_valid_transition BOOLEAN := false;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist.', p_order_id
            USING ERRCODE = 'P0016';
    END IF;

    -- State machine validation
    IF v_order.status = 'confirmed' AND p_new_status IN ('preparing', 'cancelled') THEN
        v_valid_transition := true;
    ELSIF v_order.status = 'preparing' AND p_new_status IN ('ready') THEN
        v_valid_transition := true;
    ELSIF v_order.status = 'ready' AND p_new_status IN ('collected') THEN
        v_valid_transition := true;
    ELSIF v_order.status = p_new_status THEN
        -- No-op idempotent transition
        RETURN jsonb_build_object(
            'order_id', v_order.id,
            'status', v_order.status,
            'message', 'Status already at target.'
        );
    END IF;

    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition order from % to %.', v_order.status, p_new_status
            USING ERRCODE = 'P0017';
    END IF;

    -- Update order
    UPDATE public.orders
    SET status = p_new_status,
        collected_at = CASE WHEN p_new_status = 'collected' THEN timezone('utc'::text, now()) ELSE collected_at END
    WHERE id = p_order_id;

    -- Log status history event
    INSERT INTO public.order_status_events (
        order_id,
        previous_status,
        new_status,
        actor_id,
        note
    ) VALUES (
        p_order_id,
        v_order.status,
        p_new_status,
        p_actor_id,
        p_note
    );

    RETURN jsonb_build_object(
        'order_id', v_order.id,
        'previous_status', v_order.status,
        'new_status', p_new_status,
        'updated_at', timezone('utc'::text, now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
