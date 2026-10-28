process.env.NODE_ENV = 'test';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateOrder, validateStatusTransition, validateCancelOrder } = require('../../src/validators/orderValidator');
const { validateCreateMenuItem, validateUpdateStock } = require('../../src/validators/menuValidator');
const { validatePickupWindow } = require('../../src/validators/windowValidator');
const { checkCancellationEligibility } = require('../../src/utils/dateUtils');
const AppError = require('../../src/errors/AppError');

describe('Business Rules Unit Tests: Order Validation', () => {
  it('should accept valid order payload', () => {
    const input = {
      pickup_window_id: 'w1111111-1111-1111-1111-111111111101',
      items: [
        { menu_item_id: 'm1111111-1111-1111-1111-111111111101', quantity: 2 },
        { menu_item_id: 'm1111111-1111-1111-1111-111111111102', quantity: 1 }
      ],
      notes: 'No onions please',
    };

    const validated = validateCreateOrder(input);
    assert.equal(validated.pickup_window_id, input.pickup_window_id);
    assert.equal(validated.items.length, 2);
    assert.equal(validated.items[0].quantity, 2);
    assert.equal(validated.notes, 'No onions please');
  });

  it('should reject order with empty items array', () => {
    assert.throws(() => {
      validateCreateOrder({
        pickup_window_id: 'w1111111-1111-1111-1111-111111111101',
        items: []
      });
    }, (err) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert(err.message.includes('Validation failed'));
      return true;
    });
  });

  it('should reject negative or zero quantities', () => {
    assert.throws(() => {
      validateCreateOrder({
        pickup_window_id: 'w1111111-1111-1111-1111-111111111101',
        items: [{ menu_item_id: 'm1', quantity: 0 }]
      });
    }, (err) => {
      assert(err instanceof AppError);
      return true;
    });
  });

  it('should reject quantity exceeding maximum limit (10 portions)', () => {
    assert.throws(() => {
      validateCreateOrder({
        pickup_window_id: 'w1111111-1111-1111-1111-111111111101',
        items: [{ menu_item_id: 'm1', quantity: 15 }]
      });
    }, (err) => {
      assert(err instanceof AppError);
      return true;
    });
  });
});

describe('Business Rules Unit Tests: Status Transitions', () => {
  it('should accept valid state transitions', () => {
    assert.equal(validateStatusTransition({ status: 'preparing' }).status, 'preparing');
    assert.equal(validateStatusTransition({ status: 'ready' }).status, 'ready');
    assert.equal(validateStatusTransition({ status: 'collected' }).status, 'collected');
    assert.equal(validateStatusTransition({ status: 'cancelled' }).status, 'cancelled');
  });

  it('should reject unknown status values', () => {
    assert.throws(() => {
      validateStatusTransition({ status: 'shipped_to_hostel' });
    }, (err) => {
      assert(err instanceof AppError);
      assert.equal(err.code, 'INVALID_STATUS');
      return true;
    });
  });
});

describe('Business Rules Unit Tests: Cancellation Cutoff Logic', () => {
  it('should allow cancellation when window starts in 30 minutes (cutoff = 10 mins)', () => {
    const futureDate = new Date(Date.now() + 30 * 60 * 1000);
    const eligibility = checkCancellationEligibility(futureDate, 10);
    assert.equal(eligibility.isAllowed, true);
    assert(eligibility.minutesRemaining >= 19);
  });

  it('should reject cancellation when window starts in 5 minutes (cutoff = 10 mins)', () => {
    const imminentDate = new Date(Date.now() + 5 * 60 * 1000);
    const eligibility = checkCancellationEligibility(imminentDate, 10);
    assert.equal(eligibility.isAllowed, false);
    assert.equal(eligibility.minutesRemaining, 0);
  });
});

describe('Business Rules Unit Tests: Menu & Stock Validation', () => {
  it('should validate correct menu item creation', () => {
    const input = {
      name: 'Paneer Butter Masala',
      price: 85.00,
      available_quantity: 20,
      low_stock_threshold: 5,
      is_vegetarian: true,
    };
    const item = validateCreateMenuItem(input);
    assert.equal(item.name, 'Paneer Butter Masala');
    assert.equal(item.price, 85);
    assert.equal(item.available_quantity, 20);
    assert.equal(item.is_vegetarian, true);
  });

  it('should reject negative price', () => {
    assert.throws(() => {
      validateCreateMenuItem({
        name: 'Invalid Item',
        price: -20,
        available_quantity: 10,
      });
    }, (err) => {
      assert(err instanceof AppError);
      return true;
    });
  });

  it('should validate stock adjustment quantity', () => {
    const stock = validateUpdateStock({ quantity: 15, reason: 'Morning fresh prep batch' });
    assert.equal(stock.quantity, 15);
    assert.equal(stock.reason, 'Morning fresh prep batch');
  });
});

describe('Business Rules Unit Tests: Pickup Windows Validation', () => {
  it('should reject window when ends_at is before starts_at', () => {
    const start = new Date(Date.now() + 60000);
    const end = new Date(Date.now() - 60000);

    assert.throws(() => {
      validatePickupWindow({
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        capacity: 20,
      });
    }, (err) => {
      assert(err instanceof AppError);
      return true;
    });
  });
});
