import type { AppContext } from '../../state/AppContext';
import type { Ingredient } from '../../domain/types';
import { formatBRL, formatNumber, uid, escapeHtml } from '../../domain/format';
import { renderCrudTable, type TableColumn } from '../CrudTable';
import { openModal, closeModal } from '../Modal';
import { showToast } from '../Toast';
import { autoRerender } from '../reactive';
import { qs, formValues } from '../dom';
import { ingredientUnitCost } from '../../domain/pricing';

export function renderIngredientsView(
  root: HTMLElement,
  ctx: AppContext
): () => void {
  return autoRerender(() => draw(root, ctx), [
    ctx.ingredients.subscribe.bind(ctx.ingredients)
  ]);
}

function draw(root: HTMLElement, ctx: AppContext): void {
  const table = crudTableHtml(ctx);
  root.innerHTML = `
    <div class="section-head">
      <div><h2>Ingredientes</h2><p>Catálogo mestre de ` +
    `preços e embalagens</p></div>
      <button class="btn btn-primary" id="new-ingredient">+ Novo` +
    ` ingrediente</button>
    </div>
    ${table}`;
  wireEvents(root, ctx);
}

function crudTableHtml(ctx: AppContext): string {
  return renderCrudTable({
    columns: columns(),
    rows: ctx.ingredients.getAll(),
    actions: actionButtons,
    emptyTitle: 'Nenhum ingrediente ainda',
    emptyHint: 'Cadastre o primeiro para começar a precificar.'
  });
}

function columns(): TableColumn<Ingredient>[] {
  return [
    { header: 'Nome', render: (i) => escapeHtml(i.name) },
    { header: 'Embalagem', render: (i) => `${i.packageSize} ${i.unit}` },
    {
      header: 'Preço embalagem',
      render: (i) => formatBRL(i.packagePrice),
      alignRight: true
    },
    {
      header: 'Custo unitário',
      render: (i) => `${formatBRL(ingredientUnitCost(i))}/${i.unit}`,
      alignRight: true
    },
    {
      header: 'Estoque',
      render: (i) => `${formatNumber(i.stock)} ${i.unit}`,
      alignRight: true
    }
  ];
}

function actionButtons(ingredient: Ingredient): string {
  return (
    `<button class="btn btn-ghost btn-sm" data-edit="${ingredient.id}">` +
    `Editar</button>
    <button class="btn btn-ghost btn-sm btn-danger" data-delete=` +
    `"${ingredient.id}">Excluir</button>`
  );
}

function wireEvents(root: HTMLElement, ctx: AppContext): void {
  qs('#new-ingredient', root).addEventListener('click', () => openForm(ctx));
  root.querySelectorAll<HTMLElement>('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () =>
      openForm(ctx, ctx.ingredients.getById(btn.dataset.edit!))
    )
  );
  root.querySelectorAll<HTMLElement>('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => handleDelete(ctx, btn.dataset.delete!))
  );
}

async function handleDelete(ctx: AppContext, id: string): Promise<void> {
  if (!confirm('Excluir este ingrediente?')) return;
  await ctx.ingredients.remove(id);
  showToast('Ingrediente excluído');
}

function openForm(ctx: AppContext, existing?: Ingredient): void {
  const title = existing ? 'Editar ingrediente' : 'Novo ingrediente';
  const modal = openModal({ title, bodyHtml: formHtml(existing) });
  qs('form', modal).addEventListener('submit', (event) =>
    handleSubmit(event, ctx, existing)
  );
}

function formHtml(existing?: Ingredient): string {
  const v = existing ?? {
    name: '',
    unit: 'g',
    packageSize: 0,
    packagePrice: 0,
    stock: 0,
    minStock: 0
  };
  return `<form>${textField('name', 'Nome', v.name)}
    <div class="field-row" style="grid-template-columns:1fr 1fr;">
      ${selectUnit(v.unit)}${
        numberField('packageSize', 'Tamanho da embalagem', v.packageSize)
      }</div>
    <div class="field-row" style="grid-template-columns:1fr 1fr;">
      ${
        numberField('packagePrice', 'Preço da embalagem (R$)', v.packagePrice)
      }${numberField('stock', 'Estoque atual', v.stock)}</div>
    ${numberField('minStock', 'Estoque mínimo (alerta)', v.minStock)}
    <div class="modal-foot" style="padding:16px 0 0;border:none;">
      <button type="button" class="btn" data-close-modal>Cancelar</button>
      <button type="submit" class="btn btn-primary">Salvar</button>` +
    `</div></form>`;
}

function selectUnit(current: string): string {
  const options = ['g', 'ml', 'un']
    .map(
      (u) =>
        `<option value="${u}" ${u === current ? 'selected' : ''}>${u}</option>`
    )
    .join('');
  return `<div class="field"><label class="field-label">Unidade</label>` +
    `<select class="input" name="unit">${options}</select></div>`;
}

function textField(name: string, label: string, value: string): string {
  return `<div class="field"><label class="field-label">${label}</label>
    <input class="input" name="${name}" value="${escapeHtml(value)}"` +
    ` required></div>`;
}

function numberField(name: string, label: string, value: number): string {
  return `<div class="field"><label class="field-label">${label}</label>
    <input class="input" type="number" step="0.01" min="0" name="${name}` +
    `" value="${value}" required></div>`;
}

async function handleSubmit(
  event: Event,
  ctx: AppContext,
  existing?: Ingredient
): Promise<void> {
  event.preventDefault();
  const values = formValues(event.target as HTMLFormElement);
  const data = buildIngredient(values);
  if (existing) {
    await ctx.ingredients.update(existing.id, data);
  } else {
    await ctx.ingredients.add({ id: uid(), ...data });
  }
  closeModal();
  showToast('Ingrediente salvo');
}

function buildIngredient(
  values: Record<string, string>
): Omit<Ingredient, 'id'> {
  return {
    name: values.name,
    unit: values.unit as Ingredient['unit'],
    packageSize: Number(values.packageSize),
    packagePrice: Number(values.packagePrice),
    stock: Number(values.stock),
    minStock: Number(values.minStock)
  };
}