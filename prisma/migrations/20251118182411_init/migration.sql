-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rowIndex" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "checked" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HistoryLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rowIndex" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_rowIndex_side_position_key" ON "QueueEntry"("rowIndex", "side", "position");
