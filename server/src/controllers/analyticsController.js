const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/response');

class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const overview = await analyticsService.getOverview();
      return sendSuccess(res, { overview });
    } catch (err) {
      next(err);
    }
  }

  async getHourlyDemand(req, res, next) {
    try {
      const demand = await analyticsService.getHourlyDemand();
      return sendSuccess(res, { demand });
    } catch (err) {
      next(err);
    }
  }

  async getTopItems(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const topItems = await analyticsService.getTopItems(Number(limit));
      return sendSuccess(res, { top_items: topItems });
    } catch (err) {
      next(err);
    }
  }

  async getWindowDemand(req, res, next) {
    try {
      const windows = await analyticsService.getWindowDemand();
      return sendSuccess(res, { window_demand: windows });
    } catch (err) {
      next(err);
    }
  }

  async getInventoryActivity(req, res, next) {
    try {
      const { limit = 30 } = req.query;
      const events = await analyticsService.getInventoryActivity(Number(limit));
      return sendSuccess(res, { inventory_events: events });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
