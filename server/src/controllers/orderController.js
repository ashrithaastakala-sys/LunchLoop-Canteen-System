const orderService = require('../services/orderService');
const { sendSuccess } = require('../utils/response');
const { validateCreateOrder, validateCancelOrder, validateStatusTransition } = require('../validators/orderValidator');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const validated = validateCreateOrder(req.body);
      const result = await orderService.placeOrder({
        userId: req.user.id,
        pickupWindowId: validated.pickup_window_id,
        items: validated.items,
        notes: validated.notes,
        idempotencyKey: validated.idempotency_key,
      });

      return sendSuccess(res, { order: result }, {}, result.is_idempotent_replay ? 200 : 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyOrders(req, res, next) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;
      const result = await orderService.getStudentOrders(req.user.id, {
        status,
        limit: Number(limit),
        offset: Number(offset),
      });

      return sendSuccess(res, { orders: result.orders, total: result.total }, {
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderDetails(id, req.user);
      return sendSuccess(res, { order });
    } catch (err) {
      next(err);
    }
  }

  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = validateCancelOrder(req.body);
      const result = await orderService.cancelOrder(id, req.user, reason);
      return sendSuccess(res, { cancellation: result, message: 'Order successfully cancelled and inventory restored' });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, note } = validateStatusTransition(req.body);
      const result = await orderService.updateStatus(id, status, req.user, note);
      return sendSuccess(res, { update: result, message: `Order status transitioned to ${status}` });
    } catch (err) {
      next(err);
    }
  }

  async getStaffOrders(req, res, next) {
    try {
      const { status, pickup_window_id, search, limit = 50, offset = 0, sort } = req.query;
      const result = await orderService.getStaffOrders({
        status,
        pickupWindowId: pickup_window_id,
        search,
        limit: Number(limit),
        offset: Number(offset),
        sort,
      });

      return sendSuccess(res, { orders: result.orders, total: result.total }, {
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (err) {
      next(err);
    }
  }

  async getKitchenQueue(req, res, next) {
    try {
      const queue = await orderService.getKitchenQueue();
      return sendSuccess(res, { queue, count: queue.length });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
