const orderRepository = require('../repositories/orderRepository');
const pickupWindowRepository = require('../repositories/pickupWindowRepository');
const settingsRepository = require('../repositories/settingsRepository');
const AppError = require('../errors/AppError');
const config = require('../config/env');
const { checkCancellationEligibility } = require('../utils/dateUtils');

class OrderService {
  async placeOrder({ userId, pickupWindowId, items, notes, idempotencyKey }) {
    if (!userId) {
      throw AppError.unauthorized('User ID is required to create an order');
    }

    // Call atomic transactional RPC in PostgreSQL
    const result = await orderRepository.createOrderAtomic({
      userId,
      pickupWindowId,
      items,
      notes,
      idempotencyKey,
    });

    return result;
  }

  async getStudentOrders(userId, { status, limit, offset }) {
    if (!userId) {
      throw AppError.unauthorized('User must be authenticated');
    }
    return orderRepository.getOrdersByUser(userId, { status, limit, offset });
  }

  async getOrderDetails(orderId, currentUser) {
    if (!orderId) {
      throw AppError.badRequest('Order ID is required');
    }

    const order = await orderRepository.getOrderById(orderId);
    if (!order) {
      throw AppError.notFound(`Order with ID ${orderId} not found`);
    }

    // Security check: only order owner or staff/admin can view full details
    const isOwner = currentUser && currentUser.id === order.user_id;
    const isStaffOrAdmin = currentUser && ['staff', 'admin'].includes(currentUser.role);

    if (!isOwner && !isStaffOrAdmin) {
      throw AppError.forbidden('You do not have permission to view this order.');
    }

    // Attach cancellation eligibility info
    let cancellation = { is_allowed: false, reason: 'Status is not confirmed' };
    if (order.status === 'confirmed' && order.pickup_window) {
      const eligibility = checkCancellationEligibility(order.pickup_window.starts_at, config.cancellationCutoffMinutes);
      cancellation = {
        is_allowed: eligibility.isAllowed,
        cutoff_time: eligibility.cutoffTime,
        minutes_remaining: eligibility.minutesRemaining,
        cutoff_policy_minutes: config.cancellationCutoffMinutes,
      };
    }

    return {
      ...order,
      cancellation,
    };
  }

  async cancelOrder(orderId, currentUser, reason) {
    if (!orderId) {
      throw AppError.badRequest('Order ID is required');
    }

    // Load order to verify ownership before initiating cancellation
    const order = await orderRepository.getOrderById(orderId);
    if (!order) {
      throw AppError.notFound(`Order with ID ${orderId} not found`);
    }

    const isOwner = currentUser && currentUser.id === order.user_id;
    const isStaffOrAdmin = currentUser && ['staff', 'admin'].includes(currentUser.role);

    if (!isOwner && !isStaffOrAdmin) {
      throw AppError.forbidden('You cannot cancel an order that belongs to another student');
    }

    // Fetch cancellation cutoff rule from app settings or default
    const orderRules = await settingsRepository.getSetting('order_rules');
    const cutoffMinutes = orderRules?.cancellation_cutoff_minutes || config.cancellationCutoffMinutes;

    const result = await orderRepository.cancelOrderAtomic({
      orderId,
      actorId: currentUser.id,
      reason,
      cutoffMinutes,
    });

    return result;
  }

  async updateStatus(orderId, newStatus, currentUser, note) {
    const isStaffOrAdmin = currentUser && ['staff', 'admin'].includes(currentUser.role);
    if (!isStaffOrAdmin) {
      throw AppError.forbidden('Only authorized kitchen staff or administrators can update order status');
    }

    const result = await orderRepository.updateOrderStatusAtomic({
      orderId,
      newStatus,
      actorId: currentUser.id,
      note,
    });

    return result;
  }

  async getStaffOrders(filters) {
    return orderRepository.getAllOrders(filters);
  }

  async getKitchenQueue() {
    return orderRepository.getKitchenQueue();
  }
}

module.exports = new OrderService();
