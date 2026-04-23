import { useQuery } from '@tanstack/react-query';
import { CategoryRepository } from '../repositories/CategoryRepository';

const categoryRepo = new CategoryRepository();

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryRepo.findAll(),
  });
}
