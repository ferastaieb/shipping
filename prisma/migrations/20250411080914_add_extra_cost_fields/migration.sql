-- AlterTable
ALTER TABLE `PartialShipment` ADD COLUMN `extraCostAmount` DOUBLE NULL,
    ADD COLUMN `extraCostReason` VARCHAR(191) NULL;
