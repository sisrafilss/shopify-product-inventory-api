import express from 'express';
import { getProductInventory } from '../controllers/productController.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to Shipify Inventory API' });
});

// Get 
router.get('/products/:id', getProductInventory);


export default router;