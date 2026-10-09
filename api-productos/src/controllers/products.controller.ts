import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../conf/dbConnection.ts";

interface ProductInput {
    name: string;
    price: number;
    stock: number;
    description: string;
    brand: string | null;
    img: string | null;
}

type Validation<T> = { ok: true; data: T } | { ok: false; error: string };

const COLUMNS = "id, name, price, stock, description, brand, img, active";

//valid

//id entero positiv
function parseId(value: unknown): number | null {
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return id > 0 ? id : null;
}

// precio en numero mayor 0
function parsePrice(value: unknown): number | null {
    let n: number;
    if (typeof value === "number") {
    n = value;
    } else if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
        n = Number(value.trim());
    } else {
        return null;
    }
    if (!Number.isFinite(n) || n <= 0) return null;
    if (Math.round(n * 100) / 100 !== n) return null;
    if (n > 99999999.99) return null;
    return n;
}

//texto op
function optionalText(
    value: unknown,
    field: string,
    max: number,
): Validation<string | null> {
    if (value === undefined || value === null || value === "") {
        return { ok: true, data: null };
    }
    if (typeof value !== "string" || value.length > max) {
        return { ok: false, error: `${field} debe ser texto de máximo ${max} caracteres` };
    }
    return { ok: true, data: value };
}

//validar cuerpo completo de POST y PUT
function validateProductBody(body: unknown): Validation<ProductInput> {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return { ok: false, error: "El cuerpo debe ser un objeto JSON" };
    }
    const b = body as Record<string, unknown>;

    if (typeof b["name"] !== "string" || b["name"].trim() === "" || b["name"].length > 50) {
        return { ok: false, error: "name es obligatorio (máximo 50 caracteres)" };
    }
    const price = parsePrice(b["price"]);
    if (price === null) {
        return { ok: false, error: "price debe ser numérico, mayor que cero y con máximo 2 decimales" };
    }
    const stock = b["stock"];
    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
        return { ok: false, error: "stock es obligatorio y debe ser un entero mayor o igual a 0" };
    }
    if (
        typeof b["description"] !== "string" ||
        b["description"].trim() === "" ||
        b["description"].length > 500
    ) {
        return { ok: false, error: "description es obligatoria (máximo 500 caracteres)" };
    }
    const brand = optionalText(b["brand"], "brand", 100);
    if (!brand.ok) return brand;
    const img = optionalText(b["img"], "img", 65535);
    if (!img.ok) return img;

    return {
        ok: true,
        data: {
            name: b["name"].trim(),
            price,
            stock,
            description: b["description"].trim(),
            brand: brand.data,
            img: img.data,
        },
    };
}

//controlador

export class ProductsController {
    public async getAllProducts(_req: Request, res: Response) {
    try{
        const [products] = await pool.execute<RowDataPacket[]>(
        `select ${COLUMNS} from products where active = ?`,
        [true],
        );
    res.status(200).json(products);
    } catch {
        res.status(500).json({ message: "internal server error" });
    }
    }

    public async getProductById(req: Request, res: Response) {
        const id = parseId(req.params["id"]);
        if (id === null) {
            res.status(400).json({ message: "id debe ser un entero positivo" });
            return;
    }
    try{
        const [products] = await pool.execute<RowDataPacket[]>(
        `select ${COLUMNS} from products where id = ? and active = ?`,
        [id, true],
        );
    if (!products[0]) {
        res.status(404).json({ message: "product not found" });
        return;
    }
        res.status(200).json(products[0]);
    } catch {
        res.status(500).json({ message: "internal server error" });
    }
}

public async createProduct(req: Request, res: Response) {
    const parsed = validateProductBody(req.body);
    if (!parsed.ok) {
        res.status(400).json({ message: parsed.error });
        return;
    }
    const { name, price, stock, description, brand, img } = parsed.data;
    try {
    const [result] = await pool.execute<ResultSetHeader>(
        "insert into products (name, price, stock, description, brand, img) values (?, ?, ?, ?, ?, ?)",
        [name, price, stock, description, brand, img],
    );
    res.status(201).json({
        message: "product created",
        product: { id: result.insertId, ...parsed.data, active: true },
        });
    } catch {
        res.status(500).json({ message: "internal server error" });
    }
    }

public async updateProduct(req: Request, res: Response) {
    const id = parseId(req.params["id"]);
    if (id === null) {
        res.status(400).json({ message: "id debe ser un entero positivo" });
        return;
    }
    const parsed = validateProductBody(req.body);
    if (!parsed.ok) {
        res.status(400).json({ message: parsed.error });
        return;
    }
    const { name, price, stock, description, brand, img } = parsed.data;
    try {
        const [result] = await pool.execute<ResultSetHeader>(
        "update products set name = ?, price = ?, stock = ?, description = ?, brand = ?, img = ? where id = ? and active = ?",
        [name, price, stock, description, brand, img, id, true],
    );
    if (result.affectedRows === 0) {
        res.status(404).json({ message: "product not found" });
        return;
    }
        res.status(200).json({ message: "product updated" });
    } catch {
        res.status(500).json({ message: "internal server error" });
    }
    }

    public async deleteProduct(req: Request, res: Response) {
    const id = parseId(req.params["id"]);
    if (id === null) {
        res.status(400).json({ message: "id debe ser un entero positivo" });
        return;
    }
    try {
      // baja logica no se borra, solo se pone active en false
    const [result] = await pool.execute<ResultSetHeader>(
        "update products set active = ? where id = ? and active = ?",
        [false, id, true],
    );
    if (result.affectedRows === 0) {
        res.status(404).json({ message: "product not found" });
        return;
    }
        res.status(200).json({ message: "product deactivated" });
    } catch {
        res.status(500).json({ message: "internal server error" });
    }
    }

public async changePrice(req: Request, res: Response) {
    const id = parseId(req.params["id"]);
    if (id === null) {
        res.status(400).json({ message: "id debe ser un entero positivo" });
        return;
    }
    const body: unknown = req.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        res.status(400).json({ message: "El cuerpo debe ser un objeto JSON con solo price" });
        return;
    }
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== "price") {
        res.status(400).json({ message: "El cuerpo debe contener únicamente price" });
        return;
    }
    const price = parsePrice((body as Record<string, unknown>)["price"]);
    if (price === null) {
        res.status(400).json({
        message: "price debe ser numérico, mayor que cero y con máximo 2 decimales",
    });
        return;
    }
    try {
    const [result] = await pool.execute<ResultSetHeader>(
        "update products set price = ? where id = ? and active = ?",
        [price, id, true],
    );
        if (result.affectedRows === 0) {
        res.status(404).json({ message: "product not found" });
        return;
    }
        res.status(200).json({ message: "price updated", price });
    } catch {
        res.status(500).json({ message: "internal server error" });
    }
    }
}