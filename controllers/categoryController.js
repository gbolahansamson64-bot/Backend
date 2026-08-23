const Category = require("../models/Category");


// CREATE CATEGORY
const createCategory = async (req, res) => {

    try {

        const { name, description } = req.body;

        if (!name) {

            return res.status(400).json({
                message: "Category name is required"
            });

        }

        const exists = await Category.findOne({
            name
        });

        if (exists) {

            return res.status(400).json({
                message: "Category already exists"
            });

        }

        const category = await Category.create({

            name,
            description

        });

        res.status(201).json(category);

    }

    catch (error) {
    console.log(error);

    res.status(500).json({
        message: error.message,
        stack: error.stack
    });
}

};



// // GET ALL CATEGORIES
// const getCategories = async (req, res) => {

//     try {

//         const categories = await Category.find().sort({
//             name: 1
//         });

//         res.status(200).json({
//         success: true,
//         categories
//         });

//     }

//     catch (error) {

//         res.status(500).json({
//             message: error.message
//         });

//     }

// };

// GET ALL CATEGORIES
const getCategories = async (req, res) => {
    try {

        // console.log("======================================");
        // console.log("CATEGORY DEBUG");
        // console.log("MongoDB host:", Category.db.host);
        // console.log("MongoDB database:", Category.db.name);
        // console.log("Category collection:", Category.collection.name);

        // const count = await Category.countDocuments();

        // console.log("Category document count:", count);

        const categories = await Category.find().sort({
            name: 1
        });

        // console.log("Categories returned:", categories);

        // console.log("======================================");

        res.status(200).json({
            success: true,
            categories
        });

    } catch (error) {

        // console.error("GET CATEGORIES ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};




// GET CATEGORY BY ID
const getCategoryById = async (req, res) => {

    try {

        const category = await Category.findById(req.params.id);

        if (!category) {

            return res.status(404).json({
                message: "Category not found"
            });

        }

        res.status(200).json(category);

    }

    catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};




// UPDATE CATEGORY
const updateCategory = async (req, res) => {

    try {

        const category = await Category.findById(req.params.id);

        if (!category) {

            return res.status(404).json({
                message: "Category not found"
            });

        }

        category.name = req.body.name || category.name;

        category.description =
            req.body.description || category.description;

        const updatedCategory = await category.save();

        res.status(200).json(updatedCategory);

    }

    catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};




// DELETE CATEGORY
const deleteCategory = async (req, res) => {

    try {

        const category = await Category.findById(req.params.id);

        if (!category) {

            return res.status(404).json({
                message: "Category not found"
            });

        }

        await category.deleteOne();

        res.status(200).json({
            message: "Category deleted successfully"
        });

    }

    catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {

    createCategory,

    getCategories,

    getCategoryById,

    updateCategory,

    deleteCategory

};