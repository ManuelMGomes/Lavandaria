import React, { useEffect, useMemo, useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  Shirt,
  Tag,
  Banknote,
  Boxes
} from 'lucide-react';
import { LaundryItem } from '../types';
import { formatCurrencyAO } from '../lib/format';
import { listStock, updateStockItem } from '../pages/stock/stockApi';
import type { StockItem } from '../types/stock';

interface ServicesProps {
  services: LaundryItem[];
  onAddService: (service: LaundryItem) => Promise<LaundryItem>;
  onUpdateService: (service: LaundryItem) => Promise<LaundryItem>;
  onDeleteService: (serviceId: string) => Promise<void>;
}

type StockLinkDraft = {
  stockId: string;
  enabled: boolean;
  consumptionPerService: number;
};

export const Services: React.FC<ServicesProps> = ({ 
  services, 
  onAddService, 
  onUpdateService,
  onDeleteService 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LaundryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockLinks, setStockLinks] = useState<StockLinkDraft[]>([]);
  const [stockNotice, setStockNotice] = useState('');
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    category: 'clothing' as LaundryItem['category']
  });

  const loadStock = async () => {
    try {
      const items = await listStock();
      setStockItems(items);
      setStockNotice('');
    } catch {
      setStockNotice('Não foi possível carregar os produtos de estoque para vinculação automática.');
    }
  };

  useEffect(() => {
    void loadStock();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    setStockLinks(buildStockDrafts(editingService?.id));
  }, [isModalOpen, editingService, stockItems]);

  const linkedStockCountByService = useMemo(() => {
    return stockItems.reduce<Record<string, number>>((acc, item) => {
      if (!item.linkedServiceId) return acc;
      acc[item.linkedServiceId] = (acc[item.linkedServiceId] ?? 0) + 1;
      return acc;
    }, {});
  }, [stockItems]);

  const buildStockDrafts = (serviceId?: string) =>
    stockItems.map((item) => ({
      stockId: item.id,
      enabled: item.linkedServiceId === serviceId,
      consumptionPerService: item.consumptionPerService ?? 1,
    }));

  const persistStockLinks = async (serviceId: string) => {
    const currentItems = await listStock();
    const draftsById = new Map<string, StockLinkDraft>(stockLinks.map((draft) => [draft.stockId, draft]));

    const updates = currentItems.flatMap((item) => {
      const draft = draftsById.get(item.id);
      const isLinkedToCurrentService = item.linkedServiceId === serviceId;

      if (!draft) {
        return [];
      }

      if (draft.enabled) {
        return [
          updateStockItem(item.id, {
            name: item.name,
            category: item.category,
            quantityCurrent: item.quantityCurrent,
            quantityMinimum: item.quantityMinimum,
            unit: item.unit,
            linkedServiceId: serviceId,
            consumptionPerService: draft.consumptionPerService,
          }),
        ];
      }

      if (isLinkedToCurrentService) {
        return [
          updateStockItem(item.id, {
            name: item.name,
            category: item.category,
            quantityCurrent: item.quantityCurrent,
            quantityMinimum: item.quantityMinimum,
            unit: item.unit,
            linkedServiceId: null,
            consumptionPerService: item.consumptionPerService ?? 1,
          }),
        ];
      }

      return [];
    });

    await Promise.all(updates);
    await loadStock();
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockNotice('');

    try {
      const service: LaundryItem = {
        id: editingService?.id || '',
        name: newService.name,
        price: parseFloat(newService.price),
        category: newService.category
      };

      const savedService = editingService ? await onUpdateService(service) : await onAddService(service);
      await persistStockLinks(savedService.id);

      setIsModalOpen(false);
      setEditingService(null);
      setNewService({ name: '', price: '', category: 'clothing' });
      setStockLinks(buildStockDrafts());
    } catch {
      // Error handled in App.
    }
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await onDeleteService(serviceId);
    } catch {
      // Error handled in App.
    }
  };

  const openCreateModal = () => {
    setEditingService(null);
    setNewService({ name: '', price: '', category: 'clothing' });
    setStockNotice('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: LaundryItem) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      price: String(service.price),
      category: service.category,
    });
    setStockNotice('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tabela de Serviços</h2>
          <p className="text-slate-500">Gerencie os serviços e preços da sua lavandaria.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou categoria..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Shirt className="w-6 h-6" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditModal(service)}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(service.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">{service.name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {service.category}
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {linkedStockCountByService[service.id] ?? 0} no estoque
              </span>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
              <span className="text-slate-500 text-sm">Preço Unitário</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrencyAO(service.price)}</span>
            </div>
          </div>
        ))}
        {filteredServices.length === 0 && (
          <div className="col-span-full bg-white py-20 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Shirt className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">Nenhum serviço encontrado.</p>
          </div>
        )}
      </div>

      {/* New Service Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nome do Serviço</label>
                <div className="relative">
                  <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    minLength={3}
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Lavagem de Terno"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Preço (Kz)</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    min="0.01"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0.00"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value as LaundryItem['category'] })}
                  >
                    <option value="clothing">Vestuário</option>
                    <option value="bedding">Cama e Banho</option>
                    <option value="curtains">Cortinas</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Consumo automático do estoque</p>
                    <p className="text-xs text-slate-500">Marque os produtos que este serviço consome a cada venda.</p>
                  </div>
                </div>

                {stockNotice ? <p className="text-xs font-medium text-amber-600">{stockNotice}</p> : null}

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {stockItems.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum produto cadastrado no estoque.</p>
                  ) : (
                    stockItems.map((item) => {
                      const draft = stockLinks.find((link) => link.stockId === item.id);
                      const linkedToAnotherService =
                        item.linkedServiceId && item.linkedServiceId !== editingService?.id;
                      const linkedServiceName = linkedToAnotherService
                        ? services.find((service) => service.id === item.linkedServiceId)?.name ?? 'Outro serviço'
                        : null;

                      return (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <label className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-slate-300"
                                checked={draft?.enabled ?? false}
                                disabled={Boolean(linkedToAnotherService)}
                                onChange={(event) =>
                                  setStockLinks((prev) =>
                                    prev.map((link) =>
                                      link.stockId === item.id ? { ...link, enabled: event.target.checked } : link,
                                    ),
                                  )
                                }
                              />
                              <span>
                                <span className="block text-sm font-semibold text-slate-700">{item.name}</span>
                                <span className="block text-xs text-slate-500">
                                  {item.quantityCurrent} {item.unit} em base
                                  {linkedServiceName ? ` • ligado a ${linkedServiceName}` : ''}
                                </span>
                              </span>
                            </label>

                            <div className="w-full md:w-32">
                              <input
                                type="number"
                                min="1"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                                value={draft?.consumptionPerService ?? 1}
                                disabled={!draft?.enabled || Boolean(linkedToAnotherService)}
                                onChange={(event) =>
                                  setStockLinks((prev) =>
                                    prev.map((link) =>
                                      link.stockId === item.id
                                        ? { ...link, consumptionPerService: Number(event.target.value) || 1 }
                                        : link,
                                    ),
                                  )
                                }
                              />
                              <p className="mt-1 text-[10px] font-medium text-slate-400">Consumo por venda</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 mt-4"
              >
                {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
