-- AlterTable
ALTER TABLE `PackageDetail` ADD COLUMN `costType` VARCHAR(191) NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `totalCost` DOUBLE NULL;
