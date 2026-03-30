export { Product, IProduct, IVariantStock } from './product.schema';
export { Collection, ICollection } from './collection.schema';
export { StockMovement, IStockMovement } from './stock-movement.schema';
export { Reservation, IReservation, IReservationItem } from './reservation.schema';
export { inventoryService } from './inventory.service';
export { processExpiredReservations, checkAllLowStock } from './inventory.jobs';
