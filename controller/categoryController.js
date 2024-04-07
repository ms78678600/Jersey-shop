const Category = require('../model/categoryModel');

const categoryController = {};

// Controller function for adding a new category
categoryController.addCategory = async (req, res) => {
  try {
    const { name, description, slug, order } = req.body;
    
    // Create a new category
    const newCategory = new Category({ name, description, slug, order });
    await newCategory.save();
    
    res.status(201).json({ success: true, message: 'Category added successfully', category: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add category', error: error.message });
  }
};

// Controller function for updating a category
categoryController.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, slug, order } = req.body;
    
    // Find the category by ID
    const category = await Category.findByIdAndUpdate(categoryId, { name, description, slug, order }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    res.json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

// Controller function for deleting a category
categoryController.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Find the category by ID and delete it
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    res.json({ success: true, message: 'Category deleted successfully', category: deletedCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
};

// Controller function for fetching all categories
categoryController.getCategories = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find();
    res.render()
    
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

// Controller function for showing categories
categoryController.showCategoryPage = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find();
    res.render('Categories', { categories }); // Pass categories to the view
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

// Controller function for rendering the edit category page
categoryController.renderEditCategoryPage = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    res.render('EditCategory', { category }); // Render edit category page with category data
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category for editing', error: error.message });
  }
};

// Controller function for editing a category
categoryController.editCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { name, description, slug, order } = req.body;
    await Category.findByIdAndUpdate(categoryId, { name, description, slug, order });
    res.redirect('/showcategory'); // Redirect to show category page after editing
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

module.exports = categoryController;
