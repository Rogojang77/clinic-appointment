"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import { useTimeSlotStore } from "@/store/timeStore";
import { Switch } from "@/components/ui/switch";
import { fetchTimeSlotsAPI } from "@/service/scheduleService";
import { sectionsApi, doctorsApi, locationsApi, Section, Doctor, Location } from "@/services/api";
import api from "@/services/api";

dayjs.extend(utc);

// Custom 24-hour Time Picker Component
interface TimePicker24Props {
  value: string; // Format: "HH:MM"
  onChange: (time: string) => void;
  className?: string;
}

const TimePicker24 = ({ value, onChange, className = "" }: TimePicker24Props) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHours(parseInt(h || "0", 10));
      setMinutes(parseInt(m || "0", 10));
    } else {
      setHours(0);
      setMinutes(0);
    }
  }, [value]);

  const updateTime = (newHours: number, newMinutes: number) => {
    const h = Math.max(0, Math.min(23, newHours));
    const m = Math.max(0, Math.min(59, newMinutes));
    setHours(h);
    setMinutes(m);
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  };

  const incrementHour = () => updateTime(hours + 1, minutes);
  const decrementHour = () => updateTime(hours - 1, minutes);
  const incrementMinute = () => updateTime(hours, minutes + 5);
  const decrementMinute = () => updateTime(hours, minutes - 5);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = parseInt(e.target.value, 10);
    updateTime(newHour, minutes);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = parseInt(e.target.value, 10);
    updateTime(hours, newMinute);
  };

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return { value: i, label: hour };
  });

  // Generate minute options in 5-minute increments (00, 05, 10, ..., 55)
  // But also include the current minute value if it's not a multiple of 5
  const minuteOptions = Array.from({ length: 12 }, (_, i) => {
    const minute = (i * 5).toString().padStart(2, "0");
    return { value: i * 5, label: minute };
  });
  
  // If current minute is not a multiple of 5, add it to options
  const currentMinuteOption = minutes % 5 !== 0 
    ? { value: minutes, label: minutes.toString().padStart(2, "0") }
    : null;
  
  const allMinuteOptions = currentMinuteOption
    ? [...minuteOptions, currentMinuteOption].sort((a, b) => a.value - b.value)
    : minuteOptions;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center justify-center gap-3">
        {/* Hours */}
        <div className="flex flex-col items-center gap-2">
          <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Oră
          </Label>
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={incrementHour}
              disabled={hours >= 23}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increment hour"
            >
              <ChevronUp className="h-5 w-5 text-gray-600" />
            </button>
            <select
              value={hours}
              onChange={handleHourChange}
              className="w-20 h-14 text-center text-2xl font-bold font-mono rounded-lg border-2 border-gray-300 bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
            >
              {hourOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={decrementHour}
              disabled={hours <= 0}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrement hour"
            >
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center pt-8">
          <span className="text-3xl font-bold text-gray-400">:</span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center gap-2">
          <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Minut
          </Label>
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={incrementMinute}
              disabled={minutes >= 55}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increment minute"
            >
              <ChevronUp className="h-5 w-5 text-gray-600" />
            </button>
            <select
              value={minutes}
              onChange={handleMinuteChange}
              className="w-20 h-14 text-center text-2xl font-bold font-mono rounded-lg border-2 border-gray-300 bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
            >
              {allMinuteOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={decrementMinute}
              disabled={minutes <= 0}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrement minute"
            >
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Display selected time */}
      <div className="flex items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-gray-600">Ora selectată:</span>
          <span className="text-lg font-bold font-mono text-blue-700">
            {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
};

interface Appointment {
  _id?: string;
  location: string;
  date: any;
  time: string;
  patientName: string;
  doctorName: string;
  testType: string;
  phoneNumber: string;
  isConfirmed: boolean;
  notes: string;
  sectionId?: string | { _id: string; name: string; description?: string };
  doctorId?: string | { _id: string; name: string; specialization?: string };
  section?: { _id: string; name: string; description?: string };
  doctor?: { _id: string; name: string; specialization?: string };
}

// Validation schema using Yup
const AppointmentSchema = Yup.object().shape({
  time: Yup.string().required("Ora este obligatorie"),
  patientName: Yup.string().required("Numele este obligatoriu"),
  testType: Yup.string().required("Tipul este obligatoriu"),
  phoneNumber: Yup.string().required("Numărul de telefon este obligatoriu"),
  doctorName: Yup.string().optional(),
  sectionId: Yup.string().when('testType', {
    is: (testType: string) => testType && testType !== 'Ecografie',
    then: (schema) => schema.required("Secția este obligatorie"),
    otherwise: (schema) => schema.optional(),
  }),
  doctorId: Yup.string().optional(),
});

interface AppointmentAddEditProps {
  isModalOpen: boolean;
  isEco?: boolean;
  handleModal: () => void;
  date?: any;
  location: string;
  day?: string;
  data?: Appointment | null;
  fetchAppointments: () => void;
  appointments?: any;
  selectedTestType?: string | null;
}

export default function AppointmentAddEdit({
  isModalOpen,
  isEco,
  handleModal,
  date,
  day,
  location,
  data,
  fetchAppointments,
  appointments,
  selectedTestType,
}: AppointmentAddEditProps) {
  const [customTime, setCustomTime] = useState("");
  const [selectTime, setSelectTime] = useState({
    time: "",
    date: "",
  });
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const { timeSlots, setTimeSlots } = useTimeSlotStore();
  const [hasScheduleForDay, setHasScheduleForDay] = useState(true); // Track if schedule exists
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false); // Track loading state for time slots
  const setFieldValueRef = useRef<((field: string, value: any) => void) | null>(null);
  const lastFetchedLocationRef = useRef<string>(""); // Track last fetched location to prevent duplicate requests
  const isLocationChangeInProgressRef = useRef<boolean>(false); // Track if location change is in progress
  
  // Refs for form fields to enable scrolling to invalid inputs
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const appointmentDate = dayjs(date).startOf("day");
  const formattedDate = appointmentDate.format("YYYY-MM-DD");

  // Function to scroll to the first invalid field
  const scrollToFirstInvalidField = (errors: any, touched: any) => {
    const fieldOrder = ['patientName', 'phoneNumber', 'sectionId', 'testType', 'time'];
    
    for (const fieldName of fieldOrder) {
      if (errors[fieldName] && touched[fieldName]) {
        const fieldElement = fieldRefs.current[fieldName];
        if (fieldElement) {
          // Scroll to the field with some offset from top
          fieldElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Focus the field for better UX
          setTimeout(() => {
            // If it's already an input/select/textarea, focus it directly
            if (fieldElement instanceof HTMLInputElement || fieldElement instanceof HTMLSelectElement || fieldElement instanceof HTMLTextAreaElement) {
              fieldElement.focus();
            } else if (fieldElement instanceof HTMLElement) {
              // If it's a wrapper div, find the input/select inside it
              const inputElement = fieldElement.querySelector('input, select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
              if (inputElement) {
                inputElement.focus();
              }
            }
          }, 300);
          break;
        }
      }
    }
  };

  const handleAddOrUpdateAppointment = async (
    values: any,
    { resetForm }: { resetForm: any }
  ) => {
    try {
      // Determine isDefault based on whether custom time is used
      let isDefault: boolean;
      
      // Check if the selected time is from a custom input (not from predefined slots)
      const isCustomTime = showTimeSelector && customTime && values.time === customTime;
      
      if (isCustomTime) {
        // Custom added time appointments are always non-default
        isDefault = false;
      } else {
        // Find the selected time slot from predefined slots
        const selectedSlot = (timeSlots as any[]).find(
          (slot: any) => slot.time === values.time
        );
        
        if (selectedSlot) {
          // Use the time slot's isDefault property
          // Default time slots have isDefault: true, custom slots have isDefault: false
          isDefault = selectedSlot.isDefault === true;
        } else {
          // If slot not found, default to true (shouldn't happen in normal flow)
          isDefault = true;
        }
      }

      const appointmentData = {
        ...values,
        date: formattedDate,
        isDefault,
        sectionId: values.sectionId || undefined,
        doctorId: values.doctorId || undefined,
      };

      if (data) {
        await updateAppointment(data?._id, appointmentData);
      } else {
        await createAppointment(appointmentData, formattedDate);
      }

      resetForm();
      handleModal();
      fetchAppointments();
      toast.success(
        data
          ? "Programarea a fost actualizată cu succes!"
          : "Programarea a fost creată cu succes!"
      );
    } catch (error) {
      console.error("Error handling appointment:", error);
      toast.error("A apărut o eroare la procesarea programării");
    }
  };

  const createAppointment = async (values: Appointment, formattedDate: any) => {
    try {
      const response = await api.post(
        "/appointments",
        {
          ...values,
          day: day,
          date: formattedDate,
          sectionId: values.sectionId || undefined,
          doctorId: values.doctorId || undefined,
        }
      );

      if (!response.data) {
        toast.error("Nu s-a putut crea programarea");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("A apărut o eroare la crearea programării");
    }
  };

  const updateAppointment = async (
    appointmentId: string | undefined,
    updatedData: any
  ) => {
    try {
      const response = await api.patch(
        `/appointments?id=${appointmentId}`,
        updatedData
      );
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("A apărut o eroare la actualizarea programării");
    }
  };

  // Fetch sections based on selected location
  const fetchSections = useCallback(async (locationToUse?: string) => {
    const locationValue = locationToUse || location;
    if (!locationValue || locations.length === 0) {
      setSections([]);
      return;
    }

    try {
      // Find the locationId from the location name
      const selectedLocation = locations.find((loc: any) => loc.name === locationValue);
      
      if (!selectedLocation) {
        // Try fetching all active sections if location not found
        const response = await sectionsApi.getAll({ activeOnly: true });
        setSections(response.data.data || []);
        return;
      }

      const locationId = selectedLocation._id?.toString() || selectedLocation._id;
      
      // Try fetching with locationId first
      const apiOptions: { activeOnly: boolean; locationId?: string } = { 
        activeOnly: true
      };
      
      if (locationId) {
        apiOptions.locationId = locationId;
      }
      
      let response = await sectionsApi.getAll(apiOptions);
      
      let sectionsData = response.data.data || [];
      
      // If no sections found with locationId, try fetching all active sections
      // (in case sections don't have locationId set yet)
      if (sectionsData.length === 0) {
        response = await sectionsApi.getAll({ activeOnly: true });
        sectionsData = response.data.data || [];
      }
      
      setSections(sectionsData);
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Nu s-au putut încărca secțiile");
      setSections([]);
    }
  }, [location, locations]);

  const fetchDoctors = useCallback(async (sectionId?: string) => {
    try {
      const params: { isActive: boolean; sectionId?: string } = { isActive: true };
      if (sectionId) {
        params.sectionId = sectionId;
      }
      const response = await doctorsApi.getAll(params);
      setDoctors(response.data.data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Nu s-au putut încărca medicii");
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Nu s-au putut încărca locațiile");
      // Fallback to static data
      setLocations([
        { _id: '1', name: 'Beiuș', isActive: true },
        { _id: '2', name: 'Oradea', isActive: true }
      ]);
    }
  }, []);

  // get the time slots based on section + location + day
  const fetchTimeSlots = useCallback(async (sectionIdFromForm?: string, locationToUse?: string, testTypeToUse?: string) => {
    const locationValue = locationToUse || location;
    if (locationValue && day) {
      // Prevent duplicate requests for the same location
      const requestKey = `${locationValue}-${day}-${sectionIdFromForm || 'no-section'}-${date?.format("YYYY-MM-DD") || ''}`;
      if (lastFetchedLocationRef.current === requestKey) {
        return; // Skip if we're already fetching/fetched for this exact combination
      }
      lastFetchedLocationRef.current = requestKey;
      
      setIsLoadingTimeSlots(true);
      try {
        // Format date properly for API (YYYY-MM-DD)
        const formattedDate = date?.format("YYYY-MM-DD");
        
        // Use sectionId from form values, or fall back to selectedSection state
        // Convert empty string to undefined to ensure proper API handling
        const sectionIdToUse = sectionIdFromForm || selectedSection || undefined;
        const normalizedSectionId = sectionIdToUse && sectionIdToUse.trim() !== "" 
          ? sectionIdToUse 
          : undefined;
        
        // Get testType for fallback when sectionId is not available
        // Use testType from parameter, or from data when editing, or from selected section name
        let testTypeForFilter: string | undefined = undefined;
        if (!normalizedSectionId) {
          if (testTypeToUse) {
            testTypeForFilter = testTypeToUse;
          } else if (data?.testType) {
            testTypeForFilter = data.testType;
          } else if (selectedSection) {
            // Try to get testType from selected section name
            const selectedSectionObj = sections.find((s: any) => s._id === selectedSection);
            if (selectedSectionObj?.name) {
              testTypeForFilter = selectedSectionObj.name;
            }
          }
        }
        
        // Always pass sectionId dynamically - no hardcoded values
        // Pass testType as fallback when sectionId is not available (for older appointments)
        const slots = await fetchTimeSlotsAPI(
          locationValue,
          day,
          formattedDate,
          normalizedSectionId,
          testTypeForFilter
        );
        setTimeSlots(slots || []);
        // Check if schedule exists (if slots are empty, no schedule exists)
        setHasScheduleForDay((slots || []).length > 0);
      } catch (error) {
        console.error("Error fetching time slots:", error);
        setTimeSlots([]);
        setHasScheduleForDay(false);
      } finally {
        setIsLoadingTimeSlots(false);
      }
    } else {
      setTimeSlots([]);
      setHasScheduleForDay(false);
      setIsLoadingTimeSlots(false);
    }
  }, [location, day, date, selectedSection, sections, data, setTimeSlots]);


  // Removed duplicate fetchTimeSlots - handled by the effect that watches selectedSection

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Fetch sections when location changes or when locations are loaded
  useEffect(() => {
    if (locations.length > 0 && location) {
      fetchSections();
    }
  }, [location, locations, fetchSections]);

  // Fetch sections when modal opens with a location
  useEffect(() => {
    if (isModalOpen && location && locations.length > 0) {
      fetchSections();
    }
  }, [isModalOpen, location, locations, fetchSections]);

  // Fetch doctors when component mounts (will be filtered by section later)
  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Initialize selectedSection from existing appointment data when editing
  useEffect(() => {
    if (data?.sectionId) {
      // Handle both string and populated object types
      const sectionIdValue = typeof data.sectionId === 'string' 
        ? data.sectionId 
        : data.sectionId._id;
      if (sectionIdValue && sectionIdValue !== selectedSection) {
        setSelectedSection(sectionIdValue);
      }
    } else if (!data && selectedSection && isModalOpen && !selectedTestType) {
      // Reset when creating new appointment (only when modal opens and no preselected section)
      // Don't reset if we have a selectedTestType to prefill
      setSelectedSection("");
    }
  }, [data, selectedSection, isModalOpen, selectedTestType]);

  // Auto-select Ecografie section when isEco is true and sections are loaded
  useEffect(() => {
    if (isEco && !data && isModalOpen && sections.length > 0 && !selectedSection && setFieldValueRef.current) {
      const ecografieSection = sections.find((s: any) => s.name === "Ecografie");
      if (ecografieSection) {
        setSelectedSection(ecografieSection._id);
        setFieldValueRef.current("sectionId", ecografieSection._id);
        setFieldValueRef.current("testType", "Ecografie");
      }
    }
  }, [isEco, data, isModalOpen, sections, selectedSection]);

  // Prefill section from Dashboard selectedTestType when modal opens
  useEffect(() => {
    if (selectedTestType && !data && isModalOpen && sections.length > 0 && setFieldValueRef.current) {
      // Find the section that matches the selectedTestType
      const matchingSection = sections.find((s: any) => s.name === selectedTestType);
      if (matchingSection) {
        // Only set if not already set or if it's different
        if (!selectedSection || selectedSection !== matchingSection._id) {
          setSelectedSection(matchingSection._id);
          setFieldValueRef.current("sectionId", matchingSection._id);
          setFieldValueRef.current("testType", matchingSection.name);
          
          // Fetch doctors for the preselected section
          fetchDoctors(matchingSection._id);
          
          // Fetch time slots for the preselected section and location
          if (location && day) {
            fetchTimeSlots(matchingSection._id, location, matchingSection.name);
          }
        }
      }
    }
  }, [selectedTestType, data, isModalOpen, sections, selectedSection, location, day, fetchDoctors, fetchTimeSlots]);


  // Fetch doctors when section changes
  useEffect(() => {
    if (selectedSection) {
      fetchDoctors(selectedSection);
    } else {
      // Fetch all doctors when no section is selected
      fetchDoctors();
    }
  }, [selectedSection, fetchDoctors]);

  // Fetch time slots when section, location, day, or date changes
  // Note: Location changes are handled in the onChange handler to prevent duplicate requests
  useEffect(() => {
    // Skip if location change is in progress (handled by onChange handler)
    if (isLocationChangeInProgressRef.current) {
      return;
    }
    
    if (location && day) {
      // Only fetch if location prop actually changed (not from user selection in form)
      // This prevents duplicate requests when user selects location via radio button
      const currentRequestKey = `${location}-${day}-${selectedSection || 'no-section'}-${date?.format("YYYY-MM-DD") || ''}`;
      if (lastFetchedLocationRef.current !== currentRequestKey) {
        fetchTimeSlots(selectedSection || undefined, location);
      }
    }
  }, [selectedSection, location, day, date, fetchTimeSlots]);

  // Initialize customTime and showTimeSelector when editing existing appointment
  useEffect(() => {
    if (data?.time && isModalOpen) {
      // Check if the time exists in predefined slots
      const timeExistsInSlots = timeSlots.length > 0 && timeSlots.some((slot: any) => slot.time === data.time);
      
      if (timeExistsInSlots) {
        // If time exists in slots, use predefined selector
        setCustomTime("");
        setShowTimeSelector(false);
        setSelectTime({ time: data.time, date: formattedDate });
      } else {
        // If time doesn't exist in slots (or slots not loaded yet), it's a custom time
        setCustomTime(data.time);
        setShowTimeSelector(true);
      }
    } else if (!data && isModalOpen) {
      // Reset when creating new appointment
      setCustomTime("");
      setShowTimeSelector(false);
      setSelectTime({ time: "", date: "" });
    }
  }, [data, isModalOpen, timeSlots, formattedDate]);

  return (
    <div className="w-full overflow-auto">
      <div className="mb-4">
        <Dialog open={isModalOpen} onOpenChange={handleModal}>
          <DialogContent className="min-w-[550px] max-w-[750px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-xl font-semibold">
                {data ? "Actualizează" : "Adaugă"} Programare Nouă
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {date?.format("D MMMM YYYY")} - {day}
              </p>
            </DialogHeader>
            <Formik
              enableReinitialize={true}
              initialValues={{
                timeType: data?.time && !timeSlots.some((slot: any) => slot.time === data.time) ? "custom" : "select",
                date: data?.date || formattedDate,
                time: data?.time || "",
                patientName: data?.patientName || "",
                testType: isEco ? "Ecografie" : (data?.testType || data?.section?.name || selectedTestType || ""),
                phoneNumber: data?.phoneNumber || "",
                notes: data?.notes || "",
                doctorName: isEco ? "-" : (data?.doctorName || data?.doctor?.name || ""),
                location: data?.location || location,
                isConfirmed: data?.isConfirmed ?? true,
                sectionId: data?.sectionId || data?.section?._id || (selectedTestType && sections.length > 0 
                  ? sections.find((s: any) => s.name === selectedTestType)?._id || ""
                  : ""),
                doctorId: data?.doctorId || data?.doctor?._id || "",
              }}
              validationSchema={AppointmentSchema}
              onSubmit={handleAddOrUpdateAppointment}
              validateOnChange={true}
              validateOnBlur={true}
            >
              {({ errors, touched, setFieldValue, values, setTouched, setErrors, handleSubmit, validateForm }) => {
                // Handle section change logic directly in onChange handler instead of useEffect
                // This prevents infinite loops from useEffect dependencies
                
                // Store setFieldValue in ref for use in useEffect
                setFieldValueRef.current = setFieldValue;

                // Custom submit handler that validates and scrolls to errors
                const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  
                  // Mark all fields as touched to show errors
                  const allFields = ['patientName', 'phoneNumber', 'sectionId', 'testType', 'time'];
                  const touchedFields: any = {};
                  allFields.forEach(field => {
                    touchedFields[field] = true;
                  });
                  setTouched(touchedFields);
                  
                  // Validate the form
                  const validationErrors = await validateForm();
                  
                  // Check if there are any errors
                  if (validationErrors && Object.keys(validationErrors).length > 0) {
                    setErrors(validationErrors);
                    // Scroll to first invalid field
                    setTimeout(() => {
                      scrollToFirstInvalidField(validationErrors, touchedFields);
                    }, 100);
                    toast.error('Vă rugăm să completați toate câmpurile obligatorii');
                    return;
                  }
                  
                  // If no errors, proceed with submission
                  handleSubmit(e as React.FormEvent<HTMLFormElement>);
                };

                return (
                <Form className="space-y-4 py-3" onSubmit={handleFormSubmit}>
                  {/* Patient Information Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Informații Pacient
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        ref={(el: HTMLDivElement | null) => {
                          fieldRefs.current.patientName = el;
                        }}
                      >
                        <Label htmlFor="patientName" className="mb-1.5 block text-sm font-medium">
                          Nume Pacient <span className="text-red-500">*</span>
                        </Label>
                        <Field name="patientName">
                          {({ field, meta }: any) => (
                            <Input
                              {...field}
                              id="patientName"
                              placeholder="Introduceți numele"
                              className={`w-full ${meta.error && meta.touched ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                          )}
                        </Field>
                        {errors.patientName && touched.patientName && (
                          <div className="text-red-500 text-sm mt-1">{errors.patientName}</div>
                        )}
                      </div>
                      <div
                        ref={(el: HTMLDivElement | null) => {
                          fieldRefs.current.phoneNumber = el;
                        }}
                      >
                        <Label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium">
                          Telefon <span className="text-red-500">*</span>
                        </Label>
                        <Field name="phoneNumber">
                          {({ field, meta }: any) => (
                            <Input
                              {...field}
                              id="phoneNumber"
                              placeholder="07XX XXX XXX"
                              className={`w-full ${meta.error && meta.touched ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                          )}
                        </Field>
                        {errors.phoneNumber && touched.phoneNumber && (
                          <div className="text-red-500 text-sm mt-1">{errors.phoneNumber}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section and Doctor Information */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Secție și Medic
                    </h3>
                    <div
                      ref={(el: HTMLDivElement | null) => {
                        fieldRefs.current.sectionId = el;
                      }}
                    >
                      <Label htmlFor="sectionId" className="mb-1.5 block text-sm font-medium">
                        Secție <span className="text-red-500">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="sectionId"
                        id="sectionId"
                        onChange={async (e: any) => {
                          const selectedSectionId = e.target.value;
                          const selectedSectionObj = sections.find((s: any) => s._id === selectedSectionId);
                          setFieldValue("sectionId", selectedSectionId);
                          setFieldValue("testType", selectedSectionObj?.name || "");
                          // Update selectedSection state - this will trigger useEffect to refetch time slots and doctors
                          setSelectedSection(selectedSectionId);
                          setFieldValue("doctorId", ""); // Reset doctor when section changes
                          setFieldValue("doctorName", ""); // Reset doctor name
                          setFieldValue("time", ""); // Reset time when section changes
                          setSelectTime({ time: "", date: "" }); // Reset selected time
                          
                          // Fetch time slots for the new section using current form location
                          if (values.location && day) {
                            await fetchTimeSlots(selectedSectionId, values.location, selectedSectionObj?.name);
                          }
                        }}
                        disabled={!location || sections.length === 0}
                        value={values.sectionId}
                        className={`block w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.sectionId && touched.sectionId ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      >
                        <option value="">
                          {!location ? "Selectează mai întâi o locație" : sections.length === 0 ? "Nu există secții pentru această locație" : "Selectează Secția"}
                        </option>
                        {sections.map((section: any) => (
                          <option key={section._id} value={section._id}>
                            {section.name}
                          </option>
                        ))}
                      </Field>
                      {errors.sectionId && touched.sectionId && (
                        <div className="text-red-500 text-sm mt-1">{errors.sectionId}</div>
                      )}
                    </div>

                    {values.testType === "Ecografie" ? (
                      <div>
                        <Label htmlFor="doctorName" className="mb-1.5 block text-sm font-medium">
                          Medic
                        </Label>
                        <Field 
                          name="doctorName" 
                          as={Input} 
                          id="doctorName"
                          placeholder="Nume medic"
                          className="w-full"
                        />
                        {errors.doctorName && touched.doctorName && (
                          <div className="text-red-500 text-sm mt-1">{errors.doctorName}</div>
                        )}
                      </div>
                    ) : (
                      <>
                        {selectedSection && (
                          <div>
                            <Label htmlFor="doctorId" className="mb-1.5 block text-sm font-medium">
                              Medic
                            </Label>
                            <Field
                              as="select"
                              name="doctorId"
                              id="doctorId"
                              value={values.doctorId}
                              onChange={(e: any) => {
                                const selectedDoctorId = e.target.value;
                                const selectedDoctor = doctors.find((d: any) => d._id === selectedDoctorId);
                                setFieldValue("doctorId", selectedDoctorId);
                                setFieldValue("doctorName", selectedDoctor?.name || "");
                              }}
                              className="block w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="">Selectează un medic</option>
                              {doctors.map((doctor: any) => (
                                <option key={doctor._id} value={doctor._id}>
                                  {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
                                </option>
                              ))}
                            </Field>
                            {errors.doctorId && touched.doctorId && (
                              <div className="text-red-500 text-sm mt-1">
                                {errors.doctorId}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Location Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Locație
                    </Label>
                    <div
                      role="group"
                      aria-labelledby="location-group"
                      className="flex gap-3"
                    >
                      {locations.map((loc: any) => (
                        <label 
                          key={loc._id} 
                          className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 cursor-pointer transition-all ${
                            values.location === loc.name
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <Field
                            type="radio"
                            name="location"
                            value={loc.name}
                            className="w-4 h-4 text-blue-600"
                            checked={values.location === loc.name}
                            onChange={async (e: any) => {
                              const newLocation = e.target.value;
                              // Set flag to prevent useEffect from triggering duplicate request
                              isLocationChangeInProgressRef.current = true;
                              
                              setFieldValue("location", newLocation);
                              // Reset section and related fields when location changes
                              setFieldValue("sectionId", "");
                              setFieldValue("testType", "");
                              setFieldValue("doctorId", "");
                              setFieldValue("doctorName", "");
                              setFieldValue("time", "");
                              setSelectedSection("");
                              setSelectTime({ time: "", date: "" });
                              
                              // Fetch sections for the new location
                              await fetchSections(newLocation);
                              
                              // Fetch time slots for the new location (if day is available)
                              // Pass testType from form values as fallback when sectionId is not available
                              if (day) {
                                await fetchTimeSlots(undefined, newLocation, values.testType);
                              }
                              
                              // Reset flag after a short delay to allow useEffect to skip
                              setTimeout(() => {
                                isLocationChangeInProgressRef.current = false;
                              }, 100);
                            }}
                          />
                          <span className="font-medium">{loc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection Section */}
                  <div 
                    className={`space-y-3 ${errors.time && touched.time ? 'ring-2 ring-red-500 rounded-lg p-2' : ''}`}
                    ref={(el: HTMLDivElement | null) => {
                      fieldRefs.current.time = el;
                    }}
                  >
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                        Selectare Oră <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-6 mb-3">
                        {/* Time Type Selection */}
                        <label className="flex items-center cursor-pointer group">
                          <Field
                            type="radio"
                            name="timeType"
                            value="select"
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            onChange={() => {
                              setFieldValue("timeType", "select");
                              setShowTimeSelector(false);
                              setCustomTime("");
                              setFieldValue("time", "");
                            }}
                            checked={values.timeType === "select" || (!values.timeType && showTimeSelector === false)}
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            Din programul disponibil
                          </span>
                        </label>

                        {/* Custom Time Option - Available for all days */}
                        <label className="flex items-center cursor-pointer group">
                          <Field
                            type="radio"
                            name="timeType"
                            value="custom"
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            onChange={() => {
                              setFieldValue("timeType", "custom");
                              setShowTimeSelector(true);
                              setSelectTime({ time: "", date: "" });
                            }}
                            checked={values.timeType === "custom" || (!values.timeType && showTimeSelector === true)}
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            Orar personalizat
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Time Input */}
                    {showTimeSelector ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm">
                        <div className="mb-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-600 font-bold text-lg">⚠</span>
                            <div className="text-sm text-yellow-800">
                              <p className="font-semibold mb-1">Orar temporar</p>
                              <p className="text-xs">
                                Acest orar este aplicabil doar pentru data:{" "}
                                <span className="font-bold">{formattedDate}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <TimePicker24
                          value={customTime || ""}
                          onChange={(time) => {
                            setCustomTime(time);
                            setFieldValue("time", time);
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        {isLoadingTimeSlots ? (
                          <div className="text-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Loader className="h-8 w-8 animate-spin text-blue-500" />
                              <p className="text-sm font-medium text-gray-600">
                                Se încarcă sloturile de timp...
                              </p>
                              <p className="text-xs text-gray-500">
                                Vă rugăm să așteptați
                              </p>
                            </div>
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <p className="text-sm font-medium text-gray-600 mb-2">
                              Nu există programare disponibilă
                            </p>
                            <p className="text-xs text-gray-500">
                              Nu există sloturi disponibile pentru această secție și zi.
                            </p>
                            {!hasScheduleForDay && (
                              <p className="text-xs mt-3 text-blue-600 font-medium">
                                💡 Puteți adăuga un orar personalizat folosind opțiunea de mai sus
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-gray-600 mb-3 font-medium">
                              Selectați un slot disponibil:
                            </p>
                            <div className="grid lg:grid-cols-8 md:grid-cols-6 grid-cols-4 gap-1.5">
                              {timeSlots.map((slot: any, index: number) => {
                                // Use backend's isAvailable flag - backend already filters by section+location+date
                                const isAvailable = slot.isAvailable !== false; // Default to true if not specified

                                return (
                                  <button
                                    key={`${slot.time}-${slot.date || index}`}
                                    type="button"
                                    className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                      selectTime?.time === slot.time
                                        ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-500 ring-offset-2 scale-105"
                                        : !isAvailable
                                        ? "bg-red-150 text-gray-400 cursor-not-allowed opacity-50 line-through"
                                        : "bg-white text-gray-700 border-2 border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 hover:shadow-md hover:scale-105 active:scale-95"
                                    }`}
                                    onClick={() => {
                                      if (isAvailable) {
                                        setSelectTime(slot);
                                        setFieldValue("time", slot.time);
                                        setShowTimeSelector(false);
                                        setCustomTime("");
                                      }
                                    }}
                                    disabled={!isAvailable} // Disable if not available (booked for this section)
                                    title={!isAvailable ? "Slot ocupat" : `Selectează ${slot.time}`}
                                  >
                                    {slot?.time}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {errors.time && touched.time && (
                      <div className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <span>⚠</span>
                        <span>{errors.time}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div>
                    <Label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                      Observații
                    </Label>
                    <Field
                      as="textarea"
                      name="notes"
                      id="notes"
                      rows={3}
                      placeholder="Adăugați observații sau note suplimentare..."
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>

                  {/* Confirmation Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Label
                        htmlFor="isConfirmed"
                        className="text-base font-semibold cursor-pointer"
                      >
                        {values?.isConfirmed ? (
                          <span className="text-red-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            Rezervare Închisă
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Rezervare Activă
                          </span>
                        )}
                      </Label>
                    </div>
                    <Field name="isConfirmed">
                      {({ field, form }: { field: any; form: any }) => (
                        <Switch
                          id="isConfirmed"
                          checked={field.value}
                          onCheckedChange={(checked: boolean) =>
                            form.setFieldValue("isConfirmed", checked)
                          }
                        />
                      )}
                    </Field>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-3 border-t">
                    <Button 
                      type="button" 
                      onClick={handleModal}
                      variant="outline"
                      className="w-1/2"
                    >
                      Anulează
                    </Button>
                    <Button
                      type="submit"
                      className="w-1/2 bg-blue-600 hover:bg-blue-700"
                    >
                      {data ? "Actualizează" : "Adaugă"} Programare
                    </Button>
                  </div>
                </Form>
                );
              }}
            </Formik>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

