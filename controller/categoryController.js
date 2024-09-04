const Category = require('../model/categoryModel');

const categoryController = {};

// Controller function for adding a new category
categoryController.addCategory = async (req, res) => {
  try {
    const { categoryName: name, listUnlist } = req.body;

    // Check if the category name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category name already exists!' });
    }

    const listed = listUnlist === 'list' ? true : false;

    // Create a new category
    const newCategory = new Category({ name, listed });
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
    const { name, listed} = req.body;

    // Find the category by ID
    const category = await Category.findByIdAndUpdate(categoryId, { name, listed}, { new: true });
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
    res.render('admin/Categories', { categories }); // Pass categories to the view
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
    const { name, description} = req.body;
    await Category.findByIdAndUpdate(categoryId, { name, description});
    res.redirect('/showcategory'); // Redirect to show category page after editing
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

// Controller function for listing a category
// Controller function for listing a category
categoryController.listCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(categoryId, { status: 'active' }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category listed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list category', error: error.message });
  }
};

// Controller function for unlisting a category
categoryController.unlistCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(categoryId, { status: 'inactive' }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category unlisted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unlist category', error: error.message });
  }
};

// Controller to fetch single category
categoryController.fetchSingleCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
  }
};

// Function for show add category page
categoryController.showAddCategoryPage = async (req, res) => {
  try {
    res.render('admin/AddCategory');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
  }
};

module.exports = categoryController