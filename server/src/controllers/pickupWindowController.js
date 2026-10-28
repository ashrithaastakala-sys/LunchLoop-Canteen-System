const pickupWindowRepository = require('../repositories/pickupWindowRepository');
const { sendSuccess } = require('../utils/response');
const { validatePickupWindow } = require('../validators/windowValidator');

class PickupWindowController {
  async getAvailableWindows(req, res, next) {
    try {
      const windows = await pickupWindowRepository.getUpcomingWindows();
      return sendSuccess(res, { windows });
    } catch (err) {
      next(err);
    }
  }

  async getAllWindows(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await pickupWindowRepository.getAllWindows({
        limit: Number(limit),
        offset: Number(offset),
      });
      return sendSuccess(res, { windows: result.windows, total: result.total });
    } catch (err) {
      next(err);
    }
  }

  async createWindow(req, res, next) {
    try {
      const validated = validatePickupWindow(req.body);
      const created = await pickupWindowRepository.createWindow(validated);
      return sendSuccess(res, { window: created }, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateWindow(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validatePickupWindow(req.body);
      const updated = await pickupWindowRepository.updateWindow(id, validated);
      return sendSuccess(res, { window: updated });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PickupWindowController();
