-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `createdByUserId` INTEGER NULL,
    ADD COLUMN `updatedByUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `PackageDetail` ADD COLUMN `createdByUserId` INTEGER NULL,
    ADD COLUMN `updatedByUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `PartialShipment` ADD COLUMN `createdByUserId` INTEGER NULL,
    ADD COLUMN `updatedByUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `PartialShipmentItem` ADD COLUMN `createdByUserId` INTEGER NULL,
    ADD COLUMN `updatedByUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Shipment` ADD COLUMN `createdByUserId` INTEGER NULL,
    ADD COLUMN `updatedByUserId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipment` ADD CONSTRAINT `PartialShipment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipment` ADD CONSTRAINT `PartialShipment_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageDetail` ADD CONSTRAINT `PackageDetail_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageDetail` ADD CONSTRAINT `PackageDetail_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipmentItem` ADD CONSTRAINT `PartialShipmentItem_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipmentItem` ADD CONSTRAINT `PartialShipmentItem_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
