const menuService = require('../services/menuService');
const { sendSuccess } = require('../utils/response');
const { validateCreateMenuItem, validateUpdateStock, validateUpdateAvailability } = require('../validators/menuValidator');

class MenuController {
  async getMenu(req, res, next) {
    try {
      const { category_id, category, search, vegetarian_only, max_price, sort } = req.query;
      const items = await menuService.getPublicMenu({
        categoryId: category_id || category,
        search,
        vegetarianOnly: vegetarian_only === 'true',
        maxPrice: max_price,
        sort,
      });
      return sendSuccess(res, { items, count: items.length });
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await menuService.getCategories();
      return sendSuccess(res, { categories });
    } catch (err) {
      next(err);
    }
  }

  async createItem(req, res, next) {
    try {
      const validated = validateCreateMenuItem(req.body);
      const created = await menuService.createMenuItem(validated);
      return sendSuccess(res, { item: created }, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateCreateMenuItem(req.body);
      const updated = await menuService.updateMenuItem(id, validated);
      return sendSuccess(res, { item: updated });
    } catch (err) {
      next(err);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, reason } = validateUpdateStock(req.body);
      const updated = await menuService.updateStock(id, quantity, req.user?.id, reason);
      return sendSuccess(res, { item: updated, message: 'Stock updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async toggleAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { is_available } = validateUpdateAvailability(req.body);
      const updated = await menuService.toggleAvailability(id, is_available);
      return sendSuccess(res, { item: updated, message: `Item marked as ${is_available ? 'available' : 'unavailable'}` });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MenuController();
