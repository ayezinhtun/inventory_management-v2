import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useRegionStore } from "../store/useRegionStore";
import { useWarehouseStore } from "../store/useWarehouseStore";
import { useComponentsStore } from "../store/useComponentsStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Label } from "../components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { Separator } from "../components/ui/Separator";
import { toast } from "sonner";
import { ArrowLeft, Save, X, Loader2, Plus, Trash2 } from "lucide-react";
import type {
  ItemStatus,
  ItemCondition,
  FormField,
  Component,
} from "../lib/types";

export function ComponentsAddPage() {
  const { currentUser, componentTypes, navigate, selectedId } = useStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const { createComponent, updateComponent, components, fetchComponents } =
    useComponentsStore();

  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    item_name: "",
    component_type_id: "",
    manufacturer: "",
    // model: '',
    part_number: "",
    region_id: "",
    warehouse_id: "",
    quantity: 1,
    status: "available" as ItemStatus,
    condition: "working" as ItemCondition,
    compatible_with: "",
  });

  // Specification field values — keyed by FormField id
  const [specValues, setSpecValues] = useState<Record<string, string>>({});

  // Custom specification fields (user-defined additional fields)
  const [customSpecFields, setCustomSpecFields] = useState<
    Array<{ id: string; label: string; value: string }>
  >([]);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Component[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [activeField, setActiveField] = useState<string>(""); // Track which field has autocomplete

  // Autocomplete suggestions for different fields
  const [manufacturerSuggestions, setManufacturerSuggestions] = useState<
    string[]
  >([]);
  // const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [partNumberSuggestions, setPartNumberSuggestions] = useState<string[]>(
    [],
  );
  const [showManufacturerSuggestions, setShowManufacturerSuggestions] =
    useState(false);
  // const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [showPartNumberSuggestions, setShowPartNumberSuggestions] =
    useState(false);

  useEffect(() => {
    fetchRegions();
    fetchWarehouses();
    fetchComponents(); // Fetch existing components for suggestions
  }, []);

  // Reset spec values when component type changes
  useEffect(() => {
    setSpecValues({});
    setCustomSpecFields([]);
  }, [formData.component_type_id]);

  // Handle edit mode using selectedId from store
  useEffect(() => {
    if (selectedId) {
      setEditMode(true);
      const component = components.find((c) => c.id === selectedId);
      if (component) {
        setEditingComponent(component);
        setFormData({
          item_name: component.name,
          component_type_id: component.component_type_id,
          manufacturer: component.manufacturer,
          // model: component.model,
          part_number: component.part_number,
          compatible_with: component.compatible_with || "",
          status: component.status || "available",
          condition: component.condition || "working",
          region_id: component.region_id || "",
          warehouse_id: component.warehouse_id || "",
        });
        // Set specifications separately
        const specs = component.specifications || {};
        setSpecValues(specs);

        // Extract custom fields (those not in the predefined fields)
        const selectedType = componentTypes.find(
          (ct) => ct.id === component.component_type_id,
        );
        const predefinedFieldIds = new Set(
          (selectedType?.fields ?? []).map((f) => f.id),
        );
        const customFields = Object.entries(specs)
          .filter(([key]) => !predefinedFieldIds.has(key))
          .map(([key, value]) => ({
            id: key,
            label: key,
            value: value as string,
          }));
        setCustomSpecFields(customFields);
      }
    }
  }, [components, selectedId]);

  const selectedType = componentTypes.find(
    (ct) => ct.id === formData.component_type_id,
  );
  const specFields: FormField[] = selectedType?.requires_specification
    ? (selectedType.fields ?? [])
    : [];

  const filteredWarehouses = warehouses.filter(
    (w) => w.region_id === formData.region_id && w.status === "active",
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Handle autocomplete for different fields
    if (field === "manufacturer") {
      const suggestions = getManufacturerSuggestions(value);
      setManufacturerSuggestions(suggestions);
      setShowManufacturerSuggestions(suggestions.length > 0);
    } else if (field === "part_number") {
      const suggestions = getPartNumberSuggestions(value);
      setPartNumberSuggestions(suggestions);
      setShowPartNumberSuggestions(suggestions.length > 0);
    }
  };

  // Handler functions for custom specification fields
  const addCustomSpecField = () => {
    const newField = {
      id: `custom_${Date.now()}`,
      label: "",
      value: "",
    };
    setCustomSpecFields([...customSpecFields, newField]);
  };

  const removeCustomSpecField = (id: string) => {
    setCustomSpecFields(customSpecFields.filter((f) => f.id !== id));
  };

  const updateCustomSpecField = (
    id: string,
    field: "label" | "value",
    value: string,
  ) => {
    setCustomSpecFields(
      customSpecFields.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  };

  // Get suggestions for manufacturer field
  const getManufacturerSuggestions = (input: string) => {
    if (!input) return [];

    const allComponents = components;

    const uniqueManufacturers = [
      ...new Set(allComponents.map((c) => c.manufacturer).filter(Boolean)),
    ];
    return uniqueManufacturers
      .filter((name) => name.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 5);
  };

  // Get suggestions for part number field
  const getPartNumberSuggestions = (input: string) => {
    if (!input) return [];

    const allComponents = components;

    const uniquePartNumbers = [
      ...new Set(allComponents.map((c) => c.part_number).filter(Boolean)),
    ];
    return uniquePartNumbers
      .filter((name) => name.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 5);
  };

  // Get component suggestions with full component data
  const getComponentSuggestions = (input: string) => {
    if (!input) return [];

    console.log("Components available:", components);

    const allComponents = components;

    // Get unique components by name with their full data
    const uniqueComponents = allComponents.reduce(
      (acc, component) => {
        const existing = acc.find((c) => c.name === component.name);
        if (!existing) {
          acc.push(component);
        }
        return acc;
      },
      [] as typeof allComponents,
    );

    const filtered = uniqueComponents
      .filter((component) =>
        component.name.toLowerCase().includes(input.toLowerCase()),
      )
      .slice(0, 5); // Limit to 5 suggestions
    console.log("Filtered suggestions:", filtered);
    return filtered;
  };

  // Helper function to update autocomplete position
  const updateAutocompletePosition = (input: HTMLInputElement) => {
    const rect = input.getBoundingClientRect();
    setAutocompletePosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
    setActiveInputRef(input);
  };

  // Handle input change with suggestions
  const handleNameChange = (value: string) => {
    console.log("Input changed to:", value);
    handleChange("item_name", value);
    const newSuggestions = getComponentSuggestions(value);
    console.log("New suggestions:", newSuggestions);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    setSuggestionIndex(-1);
  };

  // Handle suggestion selection - auto-fill all form fields
  const handleSuggestionSelect = (component: Component) => {
    // Auto-fill all form fields with component data
    const newFormData = {
      ...formData,
      item_name: component.name,
      component_type_id: component.component_type_id || "",
      manufacturer: component.manufacturer || "",
      // model: component.model || '',
      part_number: component.part_number || "",
      compatible_with: component.compatible_with || "",
      status: (component.status || "available") as ItemStatus,
      condition: (component.condition || "working") as ItemCondition,
      region_id: component.region_id || "",
      warehouse_id: component.warehouse_id || "",
    };

    console.log("New formData to set:", newFormData);

    setFormData(newFormData);

    // Auto-fill specifications if they exist
    if (component.specifications) {
      console.log("Setting spec values:", component.specifications);
      setSpecValues(component.specifications);
    }

    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionIndex(-1);

    // Force focus back to input
    setTimeout(() => {
      const input = document.querySelector(
        'input[placeholder="e.g. 16GB DDR4 RAM"]',
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(component.name.length, component.name.length);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (suggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[suggestionIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSuggestionIndex(-1);
        break;
    }
  };

  const handleSave = async () => {
    // Validate basic required fields
    if (!formData.item_name.trim()) {
      toast.error("Component name is required");
      return;
    }
    if (!formData.component_type_id) {
      toast.error("Component type is required");
      return;
    }
    if (!formData.region_id) {
      toast.error("Region is required");
      return;
    }
    if (!formData.warehouse_id) {
      toast.error("Warehouse is required");
      return;
    }

    // Validate required specification fields
    const selectedType = componentTypes.find(
      (ct) => ct.id === formData.component_type_id,
    );
    const specFields: FormField[] = selectedType?.requires_specification
      ? (selectedType.fields ?? [])
      : [];

    for (const field of specFields) {
      // Check if required field is empty
      if (field.required) {
        const value = specValues[field.id];

        if (!value || value.toString().trim() === "") {
          toast.error(`${field.label} is required (${field.field_type})`);
          setSaving(false);
          return;
        }
      }

      // Validate field type
      const value = specValues[field.id];
      if (field.field_type === "number") {
        const value = specValues[field.id];

        if (field.required && (!value || value.trim() === "")) {
          toast.error(`${field.label} is required`);
          return;
        }

        if (value && Number.isNaN(Number(value))) {
          toast.error(`${field.label} must be a number`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Merge predefined spec values with custom fields
      const allSpecs = {
        ...specValues,
        ...Object.fromEntries(
          customSpecFields
            .filter((f) => f.label.trim() !== "" && f.value.trim() !== "")
            .map((f) => [f.label, f.value]),
        ),
      };

      if (editMode && editingComponent) {
        // Update existing component
        await updateComponent(editingComponent.id, {
          name: formData.item_name,
          component_type_id: formData.component_type_id,
          specifications: allSpecs,
          manufacturer: formData.manufacturer,
          // model: formData.model,
          part_number: formData.part_number,
          compatible_with: formData.compatible_with,
          status: formData.status,
          condition: formData.condition,
          region_id: formData.region_id,
          warehouse_id: formData.warehouse_id,
        });
        toast.success("Component updated successfully");
      } else {
        // Create new component
        await createComponent({
          name: formData.item_name,
          component_type_id: formData.component_type_id,
          specifications: allSpecs,
          manufacturer: formData.manufacturer,
          // model: formData.model,
          part_number: formData.part_number,
          compatible_with: formData.compatible_with,
          status: formData.status,
          condition: formData.condition,
          region_id: formData.region_id,
          warehouse_id: formData.warehouse_id,
          installed_in_device_id: null,
          created_by: currentUser?.user_id || "",
          updated_by: null,
          quantity: Number(formData.quantity) || 1,
        });
        toast.success("Component added successfully");
      }
      navigate("components");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save component");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("components")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">
              {editMode ? "Edit Component" : "Add Component"}
            </h1>
            <p className="text-muted-foreground">
              {editMode
                ? "Update component information"
                : "Register a new spare part or component"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("components")}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editMode ? "Update Component" : "Save Component"}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* ── Basic Information ── */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Component Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={formData.item_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (formData.item_name) {
                      const newSuggestions = getComponentSuggestions(
                        formData.item_name,
                      );
                      setSuggestions(newSuggestions);
                      setShowSuggestions(newSuggestions.length > 0);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 300);
                  }}
                  placeholder="e.g. 16GB DDR4 RAM"
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
                  >
                    {suggestions.map((component, index) => (
                      <div
                        key={component.id}
                        className={`px-3 py-2 cursor-pointer text-sm ${index === suggestionIndex
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-50"
                          }`}
                        onClick={() => {
                          console.log("Clicked suggestion:", component);
                          handleSuggestionSelect(component);
                        }}
                        onMouseEnter={() => setSuggestionIndex(index)}
                      >
                        <div className="font-medium">{component.name}</div>
                        <div className="text-xs text-gray-500">
                          {component.manufacturer} {component.part_number}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Component Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.component_type_id}
                onValueChange={(v) => handleChange("component_type_id", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={
                      componentTypes.find(
                        (ct) => ct.id === formData.component_type_id,
                      )?.type_name
                    }
                    placeholder="Select type"
                  />
                </SelectTrigger>
                <SelectContent>
                  {componentTypes
                    .filter((ct) => ct.is_active)
                    .map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.type_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <div className="relative">
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => handleChange("manufacturer", e.target.value)}
                  placeholder="e.g. Samsung"
                  onBlur={() => {
                    setTimeout(
                      () => setShowManufacturerSuggestions(false),
                      200,
                    );
                  }}
                />
                {showManufacturerSuggestions &&
                  manufacturerSuggestions.length > 0 && (
                    <div
                      className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {manufacturerSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion}
                          className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-50"
                          onClick={() => {
                            handleChange("manufacturer", suggestion);
                            setShowManufacturerSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
            {/* <div className="space-y-2">
              <Label>Model</Label>
              <div className="relative">
                <Input 
                  value={formData.model} 
                  onChange={(e) => handleChange('model', e.target.value)} 
                  placeholder="e.g. EVO Plus"
                  onBlur={() => {
                    setTimeout(() => setShowModelSuggestions(false), 200);
                  }}
                />
                {showModelSuggestions && modelSuggestions.length > 0 && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
                    {modelSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-50"
                        onClick={() => {
                          handleChange('model', suggestion);
                          setShowModelSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div> */}
            <div className="space-y-2">
              <Label>Part Number</Label>
              <div className="relative">
                <Input
                  value={formData.part_number}
                  onChange={(e) => handleChange("part_number", e.target.value)}
                  placeholder="Enter part number"
                  onBlur={() => {
                    setTimeout(() => setShowPartNumberSuggestions(false), 200);
                  }}
                />
                {showPartNumberSuggestions &&
                  partNumberSuggestions.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {partNumberSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion}
                          className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-50"
                          onClick={() => {
                            handleChange("part_number", suggestion);
                            setShowPartNumberSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Compatible With</Label>
              <Input
                value={formData.compatible_with}
                onChange={(e) =>
                  handleChange("compatible_with", e.target.value)
                }
                placeholder="e.g. Dell R740, HP DL380"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange("status", v)}
                disabled={editMode}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={formData.status}
                    placeholder="Select status"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(v) => handleChange("condition", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={formData.condition}
                    placeholder="Select condition"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="working">Working</SelectItem>
                  <SelectItem value="broken">Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Specification Fields (shown when type requires spec and has fields) ── */}
        {(specFields.length > 0 || customSpecFields.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Predefined specification fields */}
              {specFields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {specFields.map((f) => (
                    <div key={f.id} className="space-y-2">
                      <Label>
                        {f.label}
                        {f.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      {f.field_type === "dropdown" &&
                        (f.options ?? []).length > 0 ? (
                        <Select
                          value={specValues[f.id] ?? ""}
                          onValueChange={(v) =>
                            setSpecValues((prev) => ({ ...prev, [f.id]: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              displayValue={specValues[f.id]}
                              placeholder={`Select ${f.label}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(f.options ?? []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={
                            f.field_type === "number"
                              ? "text"
                              : f.field_type === "date"
                                ? "date"
                                : f.field_type === "time"
                                  ? "time"
                                  : "text"
                          }
                          value={specValues[f.id] ?? ""}
                          onChange={(e) => {
                            let val = e.target.value;

                            // block text for number fields
                            if (f.field_type === "number") {
                              if (!/^\d*\.?\d*$/.test(val)) return;
                            }

                            setSpecValues((prev) => ({
                              ...prev,
                              [f.id]: val,
                            }));
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom specification fields */}
              {customSpecFields.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <div className="text-sm font-medium text-muted-foreground">
                    Additional Specifications
                  </div>
                  <div className="space-y-3">
                    {customSpecFields.map((field) => (
                      <div key={field.id} className="flex gap-2 items-start">
                        <Input
                          placeholder="Field name"
                          value={field.label}
                          onChange={(e) =>
                            updateCustomSpecField(
                              field.id,
                              "label",
                              e.target.value,
                            )
                          }
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) =>
                            updateCustomSpecField(
                              field.id,
                              "value",
                              e.target.value,
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomSpecField(field.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add custom field button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomSpecField}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Inventory & Location ── */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory &amp; Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Region <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.region_id}
                onValueChange={(v) => {
                  handleChange("region_id", v);
                  handleChange("warehouse_id", "");
                }}
                disabled={editMode}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={
                      regions.find((r) => r.id === formData.region_id)?.name
                    }
                    placeholder="Select region"
                  />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter((r) => (r.status ?? "").toLowerCase() === "active")
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => handleChange("warehouse_id", v)}
                disabled={!formData.region_id || editMode}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={
                      filteredWarehouses.find(
                        (w) => w.id === formData.warehouse_id,
                      )?.name
                    }
                    placeholder="Select warehouse"
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                disabled={editMode}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
