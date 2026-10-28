const menuRepository = require('../repositories/menuRepository');
const AppError = require('../errors/AppError');

class MenuService {
  async getPublicMenu(filters = {}) {
    return menuRepository.getMenuItems({
      ...filters,
      isAvailableOnly: false, // Return all items, frontend will highlight sold-out states clearly
    });
  }

  async getCategories() {
    return menuRepository.getCategories();
  }

  async getStaffMenu(filters = {}) {
    return menuRepository.getMenuItems({
      ...filters,
      isAvailableOnly: false,
    });
  }

  async createMenuItem(data) {
    return menuRepository.createMenuItem(data);
  }

  async updateMenuItem(id, updates) {
    const existing = await menuRepository.getMenuItemById(id);
    if (!existing) {
      throw AppError.notFound(`Menu item with ID ${id} not found`);
    }
    return menuRepository.updateMenuItem(id, updates);
  }

  async updateStock(id, newQuantity, actorId, reason) {
    const existing = await menuRepository.getMenuItemById(id);
    if (!existing) {
      throw AppError.notFound(`Menu item with ID ${id} not found`);
    }
    return menuRepository.updateStock(id, newQuantity, actorId, reason);
  }

  async toggleAvailability(id, isAvailable) {
    const existing = await menuRepository.getMenuItemById(id);
    if (!existing) {
      throw AppError.notFound(`Menu item with ID ${id} not found`);
    }
    return menuRepository.updateAvailability(id, isAvailable);
  }
}

module.exports = new MenuService();
