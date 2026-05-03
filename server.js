const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const basicAuth = require('express-basic-auth'); // Added for security
const app = express();

// 1. Database Connection
const dbURI = process.env.MONGODB_URI || 'your_old_link_here';

mongoose.connect(dbURI)
    .then(() => console.log("✅ Akbar Battery Cloud DB Connected!"))
    .catch(err => console.error("❌ Cloud DB Connection Error:", err));

// 2. Multer Setup for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// 3. App Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// 4. Admin Security Middleware
// This protects ALL routes starting with /admin
app.use('/admin', basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true, // Shows the browser login popup
    realm: 'Akbar Battery Admin'
}));

// 5. Product Data Model
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, enum: ['Amaron', 'Powerzone'], required: true },
    category: { type: String, enum: ['Vehicle', 'Inverter', 'Lubricant'], required: true },
    price: String,
    image: String
});
const Product = mongoose.model('Product', productSchema);

// --- ROUTES ---

app.get('/', (req, res) => res.render('home'));
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));

// Logout route to clear session
app.get('/logout', (req, res) => {
    res.status(401).send('Logged out of Akbar Battery Admin. Close your browser to fully secure.');
});

// Consumer Products Page
app.get('/products', async (req, res) => {
    try {
        const allProducts = await Product.find({});
        res.render('products', { products: allProducts });
    } catch (err) {
        res.status(500).send("Error fetching products");
    }
});

// Admin Dashboard (Now protected by basicAuth)
app.get('/admin', async (req, res) => {
    try {
        const allProducts = await Product.find({});
        res.render('admin', { products: allProducts });
    } catch (err) {
        res.status(500).send("Error loading admin dashboard");
    }
});

// Add New Product Route (Now protected by basicAuth)[cite: 1]
app.post('/admin/add', upload.single('productImage'), async (req, res) => {
    try {
        if (!req.body.name || !req.body.brand || !req.body.category) {
            return res.status(400).send("Validation Error: Name, Brand, and Category are required.");
        }

        const productData = {
            name: req.body.name,
            brand: req.body.brand,
            category: req.body.category,
            price: req.body.price,
            image: req.file ? '/uploads/' + req.file.filename : ''
        };

        const newProduct = new Product(productData);
        await newProduct.save();
        res.redirect('/admin');
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).send("Error saving product: " + err.message);
    }
});

// Delete Product Route (Now protected by basicAuth)[cite: 1]
app.post('/admin/delete/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send("Error deleting product");
    }
});

// 6. Dynamic Port for Hosting
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Akbar Battery Server running on port ${PORT}`));