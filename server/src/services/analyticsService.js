const analyticsRepository = require('../repositories/analyticsRepository');

class AnalyticsService {
  async getOverview() {
    return analyticsRepository.getOverviewStats();
  }

  async getHourlyDemand() {
    return analyticsRepository.getHourlyDemand();
  }

  async getTopItems(limit) {
    return analyticsRepository.getTopOrderedItems(limit);
  }

  async getWindowDemand() {
    return analyticsRepository.getPickupWindowDemand();
  }

  async getInventoryActivity(limit) {
    return analyticsRepository.getInventoryEvents(limit);
  }
}

module.exports = new AnalyticsService();
