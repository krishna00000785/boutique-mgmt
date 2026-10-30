-- create schema if not exists
CREATE SCHEMA IF NOT EXISTS "boutique_db";

-- CreateEnum
CREATE TYPE "boutique_db"."OrderStatus" AS ENUM ('RECEIVED', 'CUTTING', 'STITCHING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "boutique_db"."PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "boutique_db"."Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boutique_db"."Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boutique_db"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "garmentType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "stitchingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boutique_db"."Measurement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "garmentType" TEXT NOT NULL,
    "measurementData" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boutique_db"."Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boutique_db"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "boutique_db"."Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "boutique_db"."Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "boutique_db"."Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "boutique_db"."Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "boutique_db"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_expectedDeliveryDate_idx" ON "boutique_db"."Order"("expectedDeliveryDate");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "boutique_db"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Measurement_customerId_idx" ON "boutique_db"."Measurement"("customerId");

-- CreateIndex
CREATE INDEX "Measurement_orderId_idx" ON "boutique_db"."Measurement"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "boutique_db"."Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "boutique_db"."Payment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "boutique_db"."User"("email");

-- AddForeignKey
ALTER TABLE "boutique_db"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "boutique_db"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boutique_db"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "boutique_db"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boutique_db"."Measurement" ADD CONSTRAINT "Measurement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "boutique_db"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boutique_db"."Measurement" ADD CONSTRAINT "Measurement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "boutique_db"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boutique_db"."Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "boutique_db"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
