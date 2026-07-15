import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TransactionItem } from '@/src/types';

interface ItemizedExpenseFormProps {
  items: Partial<TransactionItem>[];
  onChange: (items: Partial<TransactionItem>[]) => void;
  categories: { id: string, label: string, value: string, parentId?: string | null }[];
}

export function ItemizedExpenseForm({ items, onChange, categories }: ItemizedExpenseFormProps) {
  // Build category paths for the dropdown
  const categoryPaths = categories.map(cat => {
    let path = cat.label;
    let current = cat;
    while (current.parentId) {
      const parent = categories.find(c => c.id === current.parentId);
      if (parent) {
        path = `${parent.label} > ${path}`;
        current = parent;
      } else {
        break;
      }
    }
    return { ...cat, path };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), itemName: '', quantity: 1, unitOfMeasure: 'Unidad', unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof TransactionItem, value: any) => {
    onChange(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-calculate
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        if (field === 'totalPrice') {
          if (updated.quantity && updated.quantity > 0) {
            updated.unitPrice = (updated.totalPrice || 0) / updated.quantity;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  if (items.length === 0) {
    return (
      <div className="flex justify-center mt-2">
         <button type="button" onClick={addItem} className="text-[10px] font-bold text-arca-accent uppercase tracking-widest flex items-center gap-1 bg-arca-accent/10 px-4 py-2 rounded-lg hover:bg-arca-accent/20 transition-colors">
          <Plus size={12} /> Desglosar en ítems (Ej: Mercado)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-arca-border/50">
      <div className="flex justify-between items-center ml-1">
        <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Desglose de Ítems</label>
        <button type="button" onClick={addItem} className="text-[10px] font-bold text-arca-accent uppercase tracking-widest flex items-center gap-1">
          <Plus size={12} /> Añadir Ítem
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl p-3 space-y-3 relative group">
            <button 
              type="button" 
              onClick={() => removeItem(item.id!)}
              className="absolute -right-2 -top-2 bg-arca-alert text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            >
              <Trash2 size={12} />
            </button>
            
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-6">
                <input 
                  type="text" 
                  value={item.itemName || ''}
                  onChange={(e) => updateItem(item.id!, 'itemName', e.target.value)}
                  placeholder="Nombre del producto (Ej: Arroz, Pollo...)"
                  className="w-full bg-transparent border-b border-arca-border/50 px-1 py-2 text-sm font-bold focus:outline-none focus:border-arca-accent"
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <select 
                  value={item.categoryId || ''}
                  onChange={(e) => updateItem(item.id!, 'categoryId', e.target.value)}
                  className="w-full bg-arca-surface-3 border border-arca-border rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:border-arca-accent appearance-none mt-1"
                >
                  <option value="">(Sin categoría)</option>
                  {categoryPaths.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.path}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-4 mt-2">
                <label className="text-[8px] uppercase tracking-widest text-arca-text-dim">Cant.</label>
                <input 
                  type="number" 
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(item.id!, 'quantity', Number(e.target.value))}
                  className="w-full bg-arca-surface-3 border border-arca-border rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:border-arca-accent"
                  placeholder="1"
                />
              </div>
              
              <div className="col-span-4">
                <label className="text-[8px] uppercase tracking-widest text-arca-text-dim">Unidad</label>
                <select 
                  value={item.unitOfMeasure || 'Unidad'}
                  onChange={(e) => updateItem(item.id!, 'unitOfMeasure', e.target.value)}
                  className="w-full bg-arca-surface-3 border border-arca-border rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:border-arca-accent appearance-none"
                >
                  <option value="Unidad">Und</option>
                  <option value="Kg">Kg</option>
                  <option value="g">g</option>
                  <option value="Litro">Litro</option>
                  <option value="Caja">Caja</option>
                </select>
              </div>

              <div className="col-span-4">
                <label className="text-[8px] uppercase tracking-widest text-arca-text-dim">Total</label>
                <input 
                  type="number" 
                  value={item.totalPrice || ''}
                  onChange={(e) => updateItem(item.id!, 'totalPrice', Number(e.target.value))}
                  className="w-full bg-arca-surface-3 border border-arca-border rounded-lg px-2 py-2 text-xs font-bold text-arca-accent focus:outline-none focus:border-arca-accent"
                  placeholder="$ 0"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {items.length > 0 && (
        <div className="flex justify-between items-center p-3 bg-arca-surface-3 rounded-xl border border-arca-border">
          <span className="text-xs font-bold text-arca-text-dim">Subtotal Desglosado:</span>
          <span className="text-sm font-black text-arca-text-primary">
            $ {items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0).toLocaleString('es-CO')}
          </span>
        </div>
      )}
    </div>
  );
}
