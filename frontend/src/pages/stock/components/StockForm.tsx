import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Boxes, Hash, Layers3, PackagePlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import type { LaundryItem } from '../../../types';
import type { StockFormValues, StockItem } from '../../../types/stock';

interface StockFormProps {
  item?: StockItem | null;
  services: LaundryItem[];
  isLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: StockFormValues) => Promise<void> | void;
}

const categoryOptions = [
  { value: 'Químicos', label: 'Químicos' },
  { value: 'Consumíveis', label: 'Consumíveis' },
  { value: 'Embalagens', label: 'Embalagens' },
  { value: 'Equipamentos', label: 'Equipamentos' },
  { value: 'Diversos', label: 'Diversos' },
];

const unitOptions = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Kg' },
  { value: 'litros', label: 'Litros' },
  { value: 'caixas', label: 'Caixas' },
  { value: 'pacotes', label: 'Pacotes' },
];

function getInitialValues(item?: StockItem | null): StockFormValues {
  return {
    name: item?.name ?? '',
    category: item?.category ?? categoryOptions[0].value,
    quantityCurrent: item?.quantityCurrent ?? 0,
    quantityMinimum: item?.quantityMinimum ?? 0,
    unit: item?.unit ?? unitOptions[0].value,
    linkedServiceId: item?.linkedServiceId ?? '',
    consumptionPerService: item?.consumptionPerService ?? 1,
  };
}

export function StockForm({ item, services, isLoading, onCancel, onSubmit }: StockFormProps) {
  const [values, setValues] = useState<StockFormValues>(getInitialValues(item));
  const [errors, setErrors] = useState<Partial<Record<keyof StockFormValues, string>>>({});

  useEffect(() => {
    setValues(getInitialValues(item));
    setErrors({});
  }, [item]);

  const title = useMemo(() => (item ? 'Editar produto' : 'Novo produto em stock'), [item]);

  const handleChange = <K extends keyof StockFormValues>(key: K, value: StockFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof StockFormValues, string>> = {};

    if (!values.name.trim()) nextErrors.name = 'Informe o nome do produto.';
    if (!values.category.trim()) nextErrors.category = 'Informe a categoria.';
    if (values.quantityCurrent < 0) nextErrors.quantityCurrent = 'A quantidade atual não pode ser negativa.';
    if (values.quantityMinimum < 0) nextErrors.quantityMinimum = 'A quantidade mínima não pode ser negativa.';
    if (!values.unit.trim()) nextErrors.unit = 'Informe a unidade.';
    if ((values.consumptionPerService ?? 1) <= 0) nextErrors.consumptionPerService = 'O consumo deve ser maior que zero.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Nome"
          placeholder="Ex.: Detergente industrial"
          value={values.name}
          onChange={(event) => handleChange('name', event.target.value)}
          error={errors.name}
          icon={<PackagePlus className="h-4 w-4" />}
        />
        <Select
          label="Categoria"
          value={values.category}
          onChange={(event) => handleChange('category', event.target.value)}
          options={categoryOptions}
          error={errors.category}
        />
        <Input
          label="Quantidade atual"
          type="number"
          min={0}
          value={values.quantityCurrent}
          onChange={(event) => handleChange('quantityCurrent', Number(event.target.value))}
          error={errors.quantityCurrent}
          icon={<Hash className="h-4 w-4" />}
        />
        <Input
          label="Quantidade mínima"
          type="number"
          min={0}
          value={values.quantityMinimum}
          onChange={(event) => handleChange('quantityMinimum', Number(event.target.value))}
          error={errors.quantityMinimum}
          icon={<Layers3 className="h-4 w-4" />}
        />
        <div className="md:col-span-2">
          <Select
            label="Unidade"
            value={values.unit}
            onChange={(event) => handleChange('unit', event.target.value)}
            options={unitOptions}
            error={errors.unit}
          />
        </div>
        <div className="md:col-span-2">
          <Select
            label="Serviço ligado ao consumo automático"
            value={values.linkedServiceId ?? ''}
            onChange={(event) => handleChange('linkedServiceId', event.target.value)}
            options={[
              { value: '', label: 'Sem ligação automática' },
              ...services.map((service) => ({ value: service.id, label: service.name })),
            ]}
          />
        </div>
        <Input
          label="Consumo por venda"
          type="number"
          min={1}
          value={values.consumptionPerService ?? 1}
          onChange={(event) => handleChange('consumptionPerService', Number(event.target.value))}
          error={errors.consumptionPerService}
          icon={<Boxes className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} icon={<Boxes className="h-4 w-4" />}>
          {item ? 'Guardar alterações' : 'Adicionar produto'}
        </Button>
      </div>
    </form>
  );
}
