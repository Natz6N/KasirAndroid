import { useQuery } from '@tanstack/react-query';
import { ProductRepository } from '../repositories/ProductRepository';

const productRepo = new ProductRepository();

export function useProducts(search?: string, categoryId?: number | null) {
  return useQuery({
    queryKey: ['products', search, categoryId],
    queryFn: async () => {
      if (search?.trim()) {
        return productRepo.search(search.trim());
      } else if (categoryId !== null && categoryId !== undefined) {
        return productRepo.findByCategory(categoryId);
      } else {
        return productRepo.findAll();
      }
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => productRepo.getLowStock(),
  });
}
