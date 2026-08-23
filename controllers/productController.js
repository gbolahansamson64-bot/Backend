const Product = require("../models/Product");
const Order = require("../models/Order");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (file) => {

    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(

            {
                folder: "products"
            },

            (error, result) => {

                if (error) return reject(error);

                resolve(result.secure_url);

            }

        );

        streamifier.createReadStream(file.buffer).pipe(stream);

    });

};

const createProduct = async (req, res) => {

    try {

        const {
    name,
    description,
    price,
    categoryId,
    brand,
    stock,
    badge,
    sku,
    length,
    capSize,
    laceType
} = req.body;

        if (!name || !description || !price || !categoryId) {
    return res.status(400).json({
        success: false,
        message: "Name, description, price and category are required."
    });
}  


    const category = await Category.findById(categoryId);

if (!category) {
    return res.status(404).json({
        success: false,
        message: "Category not found."
    });
}

const productStock = Number(stock) || 0;

let productStatus = "in-stock";

if (productStock <= 0) {
    productStatus = "out-of-stock";
} else if (productStock <= 5) {
    productStatus = "low-stock";
}
    
     let uploadedImages = [];

     if (req.files && req.files.length > 0) {

      uploadedImages = await Promise.all(

        req.files.map(file => uploadToCloudinary(file))

       );

    }

    const product = await Product.create({
    name,
    sku,
    description,
    price,
    category: category._id,
    brand,
    stock: productStock,
    status: productStatus,
    images: uploadedImages,
    badge,
    length,
    capSize,
    laceType
});

        res.status(201).json({
    success: true,
    message: "Product created successfully",
    product
   });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const getProducts = async (req, res) => {

    try {

        // console.log("Query Params:", req.query);

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 9;

        const skip = (page - 1) * limit;

        const {

            keyword,

            category,

            brand,

            badge,

            minPrice,

            maxPrice,

            rating,

            inStock,

            sort,

            length,

           capSize,

           laceType

        } = req.query;

        const filter = {

            isActive: true

        };

        // Search by product name

        if (keyword) {

            filter.name = {

                $regex: keyword,

                $options: "i"

            };

        }

        // Category

        if (category) {

    const categoryDoc = await Category.findOne({
    slug: category
});

if (!categoryDoc) {

    return res.status(404).json({
        success: false,
        message: "Category not found"
    });

}

filter.category = categoryDoc._id;

}
//     console.log("Category Found:");
// console.log(categoryDoc);

// console.log("Category ID:");
// console.log(categoryDoc._id.toString());

// const test = await Product.find({
//     category: categoryDoc._id
// });

// console.log("Matching Products:");
// console.log(test);


        // Brand

        if (brand) {

            filter.brand = {

                $regex: brand,

                $options: "i"

            };

        }

        // Badge

        if (badge) {

            filter.badge = badge;

        }

        // Price Range

        if (minPrice || maxPrice) {

            filter.price = {};

            if (minPrice) {

                filter.price.$gte = Number(minPrice);

            }

            if (maxPrice) {

                filter.price.$lte = Number(maxPrice);

            }

        }

        // Minimum Rating

        if (rating) {

            filter.rating = {

                $gte: Number(rating)

            };

        }

        // Stock

        if (inStock === "true") {

            filter.stock = {

                $gt: 0

            };

        }

        // Length

  if (length) {

    filter.length = length;

 }

 // Texture

//  if (texture) {

//     filter.texture = texture;

//  }

 // Cap Size

 if (capSize) {

    filter.capSize = capSize;
 
}

// Lace Type

if (laceType) {

    filter.laceType = laceType;

}


let salesMap = new Map();

if (sort === "best-selling") {

    const salesData = await Order.aggregate([
        {
            $match: {
                paymentStatus: "Paid",
                orderStatus: {
                    $ne: "Cancelled"
                }
            }
        },

        {
            $unwind: "$orderItems"
        },

        {
            $group: {
                _id: "$orderItems.product",
                totalSold: {
                    $sum: "$orderItems.quantity"
                }
            }
        }
    ]);

    salesData.forEach(function (item) {

        salesMap.set(
            item._id.toString(),
            item.totalSold
        );

    });

}


let query = Product.find(filter)
    .select(
        "_id name sku slug description price images badge stock status length capSize laceType brand rating numReviews category createdAt"
    )
    .populate("category", "name slug");


// -----------------------------------------
// SORTING
// -----------------------------------------

switch (sort) {

    case "price-low":

        query = query.sort({
            price: 1
        });

        break;


    case "price-high":

        query = query.sort({
            price: -1
        });

        break;


    case "rating":

        query = query.sort({
            rating: -1
        });

        break;


    case "newest":

        query = query.sort({
            createdAt: -1
        });

        break;


    case "best-selling":

        // Actual sales sorting happens below.

        break;


    default:

        query = query.sort({
            createdAt: -1
        });

}


const totalProducts =
    await Product.countDocuments(filter);

const totalPages =
    Math.ceil(totalProducts / limit);


let products;


if (sort === "best-selling") {

    // Get ALL matching products
    products = await query;

    // Sort using actual quantity sold
    products.sort(function (a, b) {

        const aSold =
            salesMap.get(a._id.toString()) || 0;

        const bSold =
            salesMap.get(b._id.toString()) || 0;

        return bSold - aSold;

    });

    // Paginate AFTER sorting
    products = products.slice(
        skip,
        skip + limit
    );

} else {

    products = await query
        .skip(skip)
        .limit(limit);

}


res.status(200).json({

    success: true,

    products,

    currentPage: page,

    totalPages,

    totalProducts

});

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const getProductById = async (req, res) => {

    try {

        const product = await Product.findOne({

       _id: req.params.id,

       isActive: true

       })
     .select(`
    _id
    name
    sku
    slug
    description
    price
    images
    badge
    stock
    status
    length
    capSize
    laceType
    brand
    rating
    numReviews
    category
`)
.populate("category", "_id name");

        if (!product) {

            return res.status(404).json({
                message: "Product not found"
            });

        }

        res.status(200).json(product);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const updateProduct = async (req, res) => {
    try {

        const product = await Product.findOne({

        _id: req.params.id,
 
        isActive: true

       });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (req.body.categoryId) {
    product.category = req.body.categoryId;
   }

let uploadedImages = product.images;

if (req.files && req.files.length > 0) {

    uploadedImages = await Promise.all(

        req.files.map(file => uploadToCloudinary(file))

    );

}

product.images = uploadedImages;

product.name = req.body.name || product.name;

product.sku = req.body.sku || product.sku;

product.description =
    req.body.description || product.description;

product.price =
    req.body.price ?? product.price;

product.brand =
    req.body.brand || product.brand;

product.stock =
    Number(req.body.stock ?? product.stock);

if (product.stock <= 0) {
    product.status = "out-of-stock";
} else if (product.stock <= 5) {
    product.status = "low-stock";
} else {
    product.status = "in-stock";
}
product.badge =
    req.body.badge || product.badge;

product.length =
    req.body.length || product.length;

// product.density =
    // req.body.density || product.density;

product.capSize =
    req.body.capSize || product.capSize;

product.laceType =
    req.body.laceType || product.laceType;

const updatedProduct = await product.save();

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

const deleteProduct = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        product.isActive = false;

        await product.save();

        res.status(200).json({
            message: "Product deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

const getProductBySlug = async (req, res) => {

    try {

        const product = await Product.findOne({

            slug: req.params.slug,
            isActive: true

        })
        .select(`
    _id
    name
    sku
    slug
    description
    price
    images
    badge
    stock
    status
    length
    capSize
    laceType
    brand
    rating
    numReviews
    category
`)
.populate("category", "_id name slug");

        if (!product) {

            return res.status(404).json({
                message: "Product not found"
            });

        }

        res.status(200).json(product);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductBySlug
};