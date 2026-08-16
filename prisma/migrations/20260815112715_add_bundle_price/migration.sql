-- CreateTable
CREATE TABLE "BundlePrice" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetPrice" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundlePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BundlePrice_bundleId_idx" ON "BundlePrice"("bundleId");

-- CreateIndex
CREATE INDEX "BundlePrice_companyId_idx" ON "BundlePrice"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "BundlePrice_bundleId_companyId_key" ON "BundlePrice"("bundleId", "companyId");

-- AddForeignKey
ALTER TABLE "BundlePrice" ADD CONSTRAINT "BundlePrice_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "NewsBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePrice" ADD CONSTRAINT "BundlePrice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
