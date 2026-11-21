-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- Email pesanan lama → huruf kecil, agar cocok persis dengan email akun Google (pencocokan tanpa ILIKE).
UPDATE "Order" SET "email" = lower(btrim("email")) WHERE "email" IS NOT NULL AND "email" <> lower(btrim("email"));
