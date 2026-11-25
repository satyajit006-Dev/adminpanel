
type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
};

type Response = {
  status: (code: number) => Response;
  json: (data: unknown) => void;
};

const getEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value.replace(/\/$/, "");
};

const isUUID = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.authorization;
    const token = Array.isArray(authHeader)
      ? authHeader[0]
      : authHeader;

    if (!token?.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Admin authentication required"
      });
    }

    const accessToken = token.slice(7);

    // 1. Verify the logged-in Supabase user
    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!userResponse.ok) {
      return res.status(401).json({
        ok: false,
        error: "Invalid or expired login session"
      });
    }

    const user = await userResponse.json();

    // 2. Verify admin role
    const roleUrl = new URL(
      `${supabaseUrl}/rest/v1/user_roles`
    );

    roleUrl.searchParams.set("select", "role");
    roleUrl.searchParams.set("user_id", `eq.${user.id}`);
    roleUrl.searchParams.set("limit", "1");

    const roleResponse = await fetch(roleUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });

    if (!roleResponse.ok) {
      throw new Error("Could not verify admin role");
    }

    const roles = await roleResponse.json();

    if (!roles.length || roles[0].role !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "Admin access denied"
      });
    }

    // 3. Validate product information
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Invalid product data"
      });
    }

    const name = String(body.name ?? "").trim();
    const price = Number(body.price);
    const stock = Number(body.stockQuantity);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Valid product name and price are required"
      });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid stock quantity"
      });
    }

    const categoryName = String(
      body.categoryName ?? ""
    ).trim();

    if (!categoryName) {
      return res.status(400).json({
        ok: false,
        error: "Product category is required"
      });
    }

    // 4. Resolve the real category UUID from Supabase
    const categoryUrl = new URL(
      `${supabaseUrl}/rest/v1/categories`
    );

    categoryUrl.searchParams.set("select", "id,name");
    categoryUrl.searchParams.set("name", `eq.${categoryName}`);
    categoryUrl.searchParams.set("limit", "1");

    const categoryResponse = await fetch(categoryUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });

    if (!categoryResponse.ok) {
      throw new Error("Could not find product category");
    }

    const categories = await categoryResponse.json();

    if (!categories.length) {
      return res.status(400).json({
        ok: false,
        error: "Category does not exist in Supabase"
      });
    }

    const category = categories[0];

    // 5. Map the first product image
    const images = Array.isArray(body.images)
      ? body.images
      : [];

    const imageUrl =
      typeof images[0] === "string" &&
      images[0].trim()
        ? images[0].trim()
        : null;

    if (
      imageUrl &&
      !(
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("data:image/")
      )
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid product image"
      });
    }

    // 6. Save product into existing products table
    const productData = {
      name,
      description: String(body.description ?? ""),
      price,
      image_url: imageUrl,
      category: category.name,
      stock,
      is_active:
        body.publishedToWebsite ??
        body.isAvailable ??
        true,
      category_id: category.id
    };

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/products`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(productData)
      }
    );

    const result = await insertResponse.json();

    if (!insertResponse.ok) {
      console.error("Supabase insert failed:", result);

      return res.status(500).json({
        ok: false,
        error: "Could not save product to database"
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Product saved successfully",
      product: result[0]
    });

  } catch (error) {
    console.error("Product API error:", error);

    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : "Internal server error"
    });
  }
}
