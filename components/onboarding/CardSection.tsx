"use client";

type FieldType = "number" | "text" | "email" | "date" | "checkbox" | "yesno";
type FieldOption = string | { label: string; value: string | boolean };
type Field = { name: string; label: string; type?: FieldType; placeholder?: string; options?: readonly FieldOption[]; showWhen?: { field: string; equals: boolean | string }; group?: string };

const optionLabel = (option: FieldOption) => (typeof option === "string" ? option : option.label);
const optionValue = (option: FieldOption) => String(typeof option === "string" ? option : option.value);

export function CardSection({ title, description, fields, formData, setFormData, error }: { title: string; description: string; fields: readonly Field[]; formData: Record<string, string|boolean>; setFormData: React.Dispatch<React.SetStateAction<Record<string, string|boolean>>>; error?: string }) {
  const visibleFields = fields.filter((field) => !field.showWhen || formData[field.showWhen.field] === field.showWhen.equals);

  return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-[#0A2540]">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p><div className="mt-4 grid gap-4 md:grid-cols-2">{visibleFields.map((f,index)=>{
    if (f.group === "documents" && (index === 0 || visibleFields[index - 1]?.group !== "documents")) {
      return <div key="documents-header" className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="font-semibold text-[#0A2540]">Document Checklist (for loan readiness)</p><p className="text-xs text-slate-600">These documents are typically required by banks during loan application.</p></div>;
    }

    if (f.type === "yesno") {
      const currentValue = formData[f.name];
      return <div key={f.name} className={`rounded border px-3 py-2 text-sm ${f.group === "documents" ? "bg-slate-50" : ""}`}><span className="mb-2 block font-medium">{f.label}</span><div className="flex gap-2"><button type="button" className={`rounded border px-3 py-1 ${currentValue === true ? "border-blue-600 bg-blue-600 text-white" : "bg-white"}`} onClick={()=>setFormData((p)=>({...p,[f.name]:true}))}>Yes</button><button type="button" className={`rounded border px-3 py-1 ${currentValue === false ? "border-slate-700 bg-slate-700 text-white" : "bg-white"}`} onClick={()=>setFormData((p)=>({...p,[f.name]:false}))}>No</button></div></div>;
    }

    const currentValue = String(formData[f.name] ?? "");
    const hasCurrentOption = f.options?.some((option) => optionValue(option) === currentValue);
    return <label key={f.name} className="text-sm">{f.type==="checkbox" ? <span className="flex items-center gap-2 rounded border px-3 py-2"><input type="checkbox" checked={Boolean(formData[f.name])} onChange={(e)=>setFormData((p)=>({...p,[f.name]:e.target.checked}))} />{f.label}</span> : <><span className="mb-1 block font-medium">{f.label}</span>{f.options ? <select className="w-full rounded border px-3 py-2" value={currentValue} onChange={(e)=>setFormData((p)=>({...p,[f.name]:e.target.value}))}><option value="">Select...</option>{currentValue && !hasCurrentOption ? <option value={currentValue}>{currentValue}</option> : null}{f.options.map((o)=><option key={optionValue(o)} value={optionValue(o)}>{optionLabel(o)}</option>)}</select> : <input className="w-full rounded border px-3 py-2" type={f.type ?? "text"} value={currentValue} placeholder={f.placeholder} onChange={(e)=>setFormData((p)=>({...p,[f.name]:e.target.value}))} />}</>}</label>;
  })}</div>{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}</div>;
}
