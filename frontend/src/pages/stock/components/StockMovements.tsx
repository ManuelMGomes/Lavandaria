import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ClipboardList, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import type { StockMovement, StockResolvedItem } from '../../../types/stock';

interface StockMovementsProps {
  items: StockResolvedItem[];
  movements: StockMovement[];
  loading?: boolean;
  saving?: boolean;
  onRegisterEntry: (payload: { productId: string; quantity: number; note?: string }) => Promise<void> | void;
  onRegisterExit: (payload: { productId: string; quantity: number; note?: string }) => Promise<void> | void;
}

type MovementMode = 'entry' | 'exit';

export function StockMovements({
  items,
  movements,
  loading,
  saving,
  onRegisterEntry,
  onRegisterExit,
}: StockMovementsProps) {
  const [mode, setMode] = useState<MovementMode | null>(null);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const productOptions = useMemo(
    () => items.map((item) => ({ value: item.id, label: `${item.name} (${item.quantityCurrent} ${item.unit})` })),
    [items],
  );

  const closeModal = () => {
    setMode(null);
    setProductId(items[0]?.id ?? '');
    setQuantity(1);
    setNote('');
  };

  const openModal = (nextMode: MovementMode) => {
    setMode(nextMode);
    setProductId(items[0]?.id ?? '');
    setQuantity(1);
    setNote('');
  };

  const submitMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId || quantity <= 0 || !mode) return;

    if (mode === 'entry') {
      await onRegisterEntry({ productId, quantity, note });
    } else {
      await onRegisterExit({ productId, quantity, note });
    }

    closeModal();
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Movimentações</h2>
            <p className="text-sm text-slate-500">Entradas e saídas manuais do gestor. As vendas geram saídas automáticas.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="success" icon={<ArrowUpCircle className="h-4 w-4" />} onClick={() => openModal('entry')}>
              Entrada
            </Button>
            <Button variant="outline" icon={<ArrowDownCircle className="h-4 w-4" />} onClick={() => openModal('exit')}>
              Saída
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm text-slate-500">Ainda não existem movimentações registadas.</p>
          </div>
        ) : (
          <div className="space-y-2 p-5">
            {movements.slice(0, 10).map((movement) => (
              <div key={movement.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${
                      movement.type === 'entry' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {movement.type === 'entry' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{movement.productName}</p>
                    <p className="text-sm text-slate-500">{movement.note || 'Sem observação'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6 md:justify-end">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${movement.type === 'entry' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {movement.type === 'entry' ? '+' : '-'} {movement.quantity}
                    </p>
                    <p className="text-xs text-slate-500">
                      {movement.type === 'entry' ? 'Entrada' : 'Saída'} em {format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={mode !== null}
        onClose={closeModal}
        title={mode === 'entry' ? 'Registar entrada' : 'Registar saída'}
        size="md"
      >
        <form className="space-y-5" onSubmit={submitMovement}>
          <Select
            label="Produto"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            options={productOptions.length > 0 ? productOptions : [{ value: '', label: 'Nenhum produto disponível' }]}
            disabled={productOptions.length === 0}
          />
          <Input
            label="Quantidade"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            icon={<Package className="h-4 w-4" />}
          />
          <Input
            label="Observação"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: reposição semanal"
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={saving}
              disabled={productOptions.length === 0 || !productId || quantity <= 0}
              icon={mode === 'entry' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
            >
              {mode === 'entry' ? 'Confirmar entrada' : 'Confirmar saída'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
