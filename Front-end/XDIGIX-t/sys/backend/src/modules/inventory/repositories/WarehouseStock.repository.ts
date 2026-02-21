import mongoose from 'mongoose';
import { WarehouseStockModel, type IWarehouseStock } from '../models/WarehouseStock.model';

export class WarehouseStockRepository {
  async findByProductClient(
    productId: string,
    clientId: string,
    session?: mongoose.ClientSession
  ) {
    return WarehouseStockModel.findOne({ productId, clientId }).session(session || null).lean() as Promise<IWarehouseStock | null>;
  }

  async upsert(
    productId: string,
    clientId: string,
    availableQuantity: number,
    session?: mongoose.ClientSession
  ): Promise<void> {
    await WarehouseStockModel.updateOne(
      { productId, clientId },
      {
        $set: {
          availableQuantity,
          lastTransactionAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, session }
    );
  }
}
