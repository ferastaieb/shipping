/*
  Warnings:

  - You are about to drop the column `amount` on the `PartialShipmentItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `PackageDetail` ADD COLUMN `typeOfPackage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PartialShipmentItem` DROP COLUMN `amount`;
