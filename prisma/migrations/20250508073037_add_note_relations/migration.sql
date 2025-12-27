-- AlterTable
ALTER TABLE `Note` ADD COLUMN `createdByUserId` INTEGER NULL,
    ADD COLUMN `updatedByUserId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
