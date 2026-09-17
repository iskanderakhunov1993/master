"use client";

import { Check, Edit3, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  createAddressAction,
  deleteAddressAction,
  setPrimaryAddressAction,
  updateAddressAction,
} from "@/lib/addresses/actions";
import type { ClientAddress, ClientAddressInput } from "@/lib/addresses/types";
import { useDialogAccessibility } from "@/lib/ui/use-dialog-accessibility";

const emptyAddress: ClientAddressInput = {
  city: "",
  street: "",
  house: "",
  apartment: "",
  comment: "",
  isPrimary: false,
};

export function AddressManager({ addresses }: { addresses: ClientAddress[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientAddressInput>(emptyAddress);
  const [error, setError] = useState("");
  const editorRef = useDialogAccessibility<HTMLElement>(isEditorOpen, closeEditor, !isPending);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyAddress, isPrimary: addresses.length === 0 });
    setError("");
    setIsEditorOpen(true);
  }

  function openEdit(address: ClientAddress) {
    setEditingId(address.id);
    setForm({
      city: address.city,
      street: address.street,
      house: address.house,
      apartment: address.apartment,
      comment: address.comment,
      isPrimary: address.isPrimary,
    });
    setError("");
    setIsEditorOpen(true);
  }

  function closeEditor() {
    if (isPending) return;
    setIsEditorOpen(false);
    setEditingId(null);
    setError("");
  }

  function updateField(field: keyof ClientAddressInput, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = editingId
        ? await updateAddressAction(editingId, form)
        : await createAddressAction(form);
      if (!result.ok) {
        setError(result.message ?? "Не удалось сохранить адрес");
        return;
      }
      setIsEditorOpen(false);
      setEditingId(null);
      router.refresh();
    });
  }

  function removeAddress(address: ClientAddress) {
    if (!window.confirm(`Удалить адрес «${address.street}, ${address.house}»? Он пропадёт из списка сохранённых. Заказы, где он уже указан, не изменятся.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteAddressAction(address.id);
      if (!result.ok) setError(result.message ?? "Не удалось удалить адрес");
      router.refresh();
    });
  }

  function makePrimary(addressId: string) {
    setError("");
    startTransition(async () => {
      const result = await setPrimaryAddressAction(addressId);
      if (!result.ok) setError(result.message ?? "Не удалось изменить основной адрес");
      router.refresh();
    });
  }

  return (
    <div className="addresses-page">
      <header className="client-page-heading">
        <div><span>Кабинет клиента</span><h1>Адреса</h1><p>Сохраните адреса, чтобы быстрее создавать новые заказы.</p></div>
        <button className="button button--primary" type="button" onClick={openCreate}><Plus size={18} /> Добавить адрес</button>
      </header>

      {error && <div className="client-alert client-alert--error" role="alert">{error}</div>}

      {addresses.length === 0 ? (
        <section className="client-empty-card">
          <span><MapPin size={29} /></span>
          <h2>Нет сохранённых адресов</h2>
          <p>Добавьте первый адрес — он станет основным и появится в форме заказа.</p>
          <button className="button button--primary" type="button" onClick={openCreate}><Plus size={17} /> Добавить адрес</button>
        </section>
      ) : (
        <div className="address-grid">
          {addresses.map((address) => (
            <article className="address-card" key={address.id}>
              <div className="address-card__top">
                <span className="address-card__icon"><MapPin size={21} /></span>
                {address.isPrimary && <span className="primary-badge"><Star size={12} fill="currentColor" /> Основной</span>}
              </div>
              <h2>{address.street}, {address.house}{address.apartment ? `, кв. ${address.apartment}` : ""}</h2>
              <p>{address.city}</p>
              {address.comment && <small>{address.comment}</small>}
              <div className="address-card__actions">
                {!address.isPrimary && <button type="button" disabled={isPending} onClick={() => makePrimary(address.id)}><Check size={15} /> Сделать основным</button>}
                <button type="button" disabled={isPending} onClick={() => openEdit(address)} aria-label={`Редактировать адрес ${address.street}`}><Edit3 size={16} /></button>
                <button className="is-danger" type="button" disabled={isPending} onClick={() => removeAddress(address)} aria-label={`Удалить адрес ${address.street}`}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <div className="address-editor-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) closeEditor();
        }}>
          <section className="address-editor" ref={editorRef} role="dialog" aria-modal="true" aria-labelledby="address-editor-title" tabIndex={-1}>
            <div className="address-editor__heading">
              <div><span>{editingId ? "Редактирование" : "Новый адрес"}</span><h2 id="address-editor-title">{editingId ? "Изменить адрес" : "Добавить адрес"}</h2></div>
              <button type="button" onClick={closeEditor} aria-label="Закрыть"><X size={20} /></button>
            </div>
            <form onSubmit={submit}>
              <label>Город<input value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Москва" autoComplete="address-level2" required /></label>
              <label className="address-editor__wide">Улица<input value={form.street} onChange={(event) => updateField("street", event.target.value)} placeholder="Название улицы" autoComplete="address-line1" required /></label>
              <label>Дом<input value={form.house} onChange={(event) => updateField("house", event.target.value)} placeholder="12" required /></label>
              <label>Квартира<input value={form.apartment} onChange={(event) => updateField("apartment", event.target.value)} placeholder="45" /></label>
              <label className="address-editor__wide">Комментарий мастеру<textarea value={form.comment} onChange={(event) => updateField("comment", event.target.value)} placeholder="Подъезд, этаж, домофон" maxLength={500} rows={3} /></label>
              {!editingId && <label className="checkbox-field address-editor__wide"><input type="checkbox" checked={Boolean(form.isPrimary)} onChange={(event) => updateField("isPrimary", event.target.checked)} /><span><Check size={14} /></span> Сделать основным адресом</label>}
              {error && <div className="form-error address-editor__wide" role="alert">{error}</div>}
              <div className="address-editor__footer address-editor__wide">
                <button className="button button--secondary" type="button" onClick={closeEditor}>Отмена</button>
                <button className="button button--primary" type="submit" disabled={isPending}>{isPending ? "Сохраняем…" : "Сохранить адрес"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
