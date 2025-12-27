-- CreateTable
CREATE TABLE `Shipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `destination` VARCHAR(191) NOT NULL,
    `dateCreated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `totalWeight` DOUBLE NOT NULL DEFAULT 0.0,
    `totalVolume` DOUBLE NOT NULL DEFAULT 0.0,
    `driverName` VARCHAR(191) NULL,
    `driverVehicle` VARCHAR(191) NULL,
    `dateClosed` DATETIME(3) NULL,
    `noteId` INTEGER NULL,

    UNIQUE INDEX `Shipment_noteId_key`(`noteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartialShipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receiverName` VARCHAR(191) NULL,
    `receiverPhone` VARCHAR(191) NULL,
    `receiverAddress` VARCHAR(191) NULL,
    `volume` DOUBLE NOT NULL DEFAULT 0.0,
    `cost` DOUBLE NOT NULL DEFAULT 0.0,
    `amountPaid` DOUBLE NOT NULL DEFAULT 0.0,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0.0,
    `paymentStatus` VARCHAR(191) NULL,
    `paymentResponsibility` VARCHAR(191) NULL,
    `paymentCompleted` BOOLEAN NOT NULL DEFAULT false,
    `shipmentId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `noteId` INTEGER NULL,

    UNIQUE INDEX `PartialShipment_noteId_key`(`noteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `length` DOUBLE NOT NULL,
    `width` DOUBLE NOT NULL,
    `height` DOUBLE NOT NULL,
    `weight` DOUBLE NOT NULL,
    `units` INTEGER NOT NULL DEFAULT 1,
    `partialShipmentId` INTEGER NOT NULL,
    `noteId` INTEGER NULL,

    UNIQUE INDEX `PackageDetail_noteId_key`(`noteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartialShipmentItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight` DOUBLE NOT NULL,
    `origin` VARCHAR(191) NOT NULL,
    `hscode` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `priceByUnit` DOUBLE NULL,
    `partialShipmentId` INTEGER NOT NULL,
    `noteId` INTEGER NULL,

    UNIQUE INDEX `PartialShipmentItem_noteId_key`(`noteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0.0,
    `origin` VARCHAR(191) NULL,
    `noteId` INTEGER NULL,

    UNIQUE INDEX `Customer_noteId_key`(`noteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Note` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` VARCHAR(191) NULL,
    `images` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `Note`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipment` ADD CONSTRAINT `PartialShipment_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipment` ADD CONSTRAINT `PartialShipment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipment` ADD CONSTRAINT `PartialShipment_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `Note`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageDetail` ADD CONSTRAINT `PackageDetail_partialShipmentId_fkey` FOREIGN KEY (`partialShipmentId`) REFERENCES `PartialShipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageDetail` ADD CONSTRAINT `PackageDetail_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `Note`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipmentItem` ADD CONSTRAINT `PartialShipmentItem_partialShipmentId_fkey` FOREIGN KEY (`partialShipmentId`) REFERENCES `PartialShipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartialShipmentItem` ADD CONSTRAINT `PartialShipmentItem_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `Note`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `Note`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
