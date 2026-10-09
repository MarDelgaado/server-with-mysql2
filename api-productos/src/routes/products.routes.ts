import { Router } from "express";
import { ProductsController } from "../controllers/products.controller.ts";

const router = Router();
const productsController = new ProductsController();

router.get("/getAll", productsController.getAllProducts);
router.get("/getById/:id", productsController.getProductById);
router.post("/create", productsController.createProduct);
router.put("/update/:id", productsController.updateProduct);
router.delete("/delete/:id", productsController.deleteProduct);
router.patch("/change-price/:id", productsController.changePrice);

export default router;