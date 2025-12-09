"use client";

import { useEffect, useState, useCallback } from "react";
import { Formik, Form, Field, FormikHelpers, FormikErrors } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { departmentsData, locations } from "@/lib/department";
import axios from "axios";
import toast from "react-hot-toast";
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import { useTimeSlotStore } from "@/store/timeStore";
import { Switch } from "@/components/ui/switch";
import { fetchTimeSlotsAPI } from "@/service/scheduleService";
import { sectionsApi, doctorsApi, locationsApi, Section, Doctor, Location } from "@/services/api";

dayjs.extend(utc);

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
  sectionId?: string;
  doctorId?: string;
}

// Validation schema using Yup
const AppointmentSchema = Yup.object().shape({
  time: Yup.string().required("Time is required"),
  patientName: Yup.string().required("Name is required"),
  testType: Yup.string().required("Type is required"),
  phoneNumber: Yup.string().required("Phone number is required"),
  doctorName: Yup.string().required("Doctor is required"),
  sectionId: Yup.string().when('testType', {
    is: (testType: string) => testType && testType !== 'Ecografie',
    then: (schema) => schema.required("Section is required"),
    otherwise: (schema) => schema.optional(),
  }),
  doctorId: Yup.string().when('testType', {
    is: (testType: string) => testType && testType !== 'Ecografie',
    then: (schema) => schema.required("Doctor is required"),
    otherwise: (schema) => schema.optional(),
  }),
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

  const appointmentDate = dayjs(date).startOf("day");
  const formattedDate = appointmentDate.format("YYYY-MM-DD");

  const handleAddOrUpdateAppointment = async (
    values: any,
    { resetForm }: { resetForm: any }
  ) => {
    try {
      const isDefault = timeSlots.some(
        (slot: any) => slot.time === values.time && slot.date === "00:00:00"
      );

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
          ? "Appointment Updated Successfully!"
          : "Appointment Created Successfully!"
      );
    } catch (error) {
      console.error("Error handling appointment:", error);
      toast.error("An error occurred while handling the appointment");
    }
  };

  const createAppointment = async (values: Appointment, formattedDate: any) => {
    try {
      const response = await axios.post(
        "/api/appointments",
        {
          ...values,
          day: day,
          date: formattedDate,
          sectionId: values.sectionId || undefined,
          doctorId: values.doctorId || undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data) {
        toast.error("Failed to create appointment");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("An error occurred while creating the appointment");
    }
  };

  const updateAppointment = async (
    appointmentId: string | undefined,
    updatedData: any
  ) => {
    try {
      const response = await axios.patch(
        `/api/appointments?id=${appointmentId}`,
        updatedData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("An error occurred while updating the appointment");
    }
  };

  // Fetch sections and doctors
  const fetchSections = async () => {
    try {
      const response = await sectionsApi.getAll({ activeOnly: true });
      setSections(response.data.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Failed to load sections");
    }
  };

  const fetchDoctors = async (sectionId?: string) => {
    try {
      const params: { isActive: boolean; sectionId?: string } = { isActive: true };
      if (sectionId) {
        params.sectionId = sectionId;
      }
      const response = await doctorsApi.getAll(params);
      setDoctors(response.data.data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Failed to load locations");
      // Fallback to static data
      setLocations([
        { _id: '1', name: 'Beiuș', isActive: true },
        { _id: '2', name: 'Oradea', isActive: true }
      ]);
    }
  };

  // get the time slots ...
  const fetchTimeSlots = useCallback(async () => {
    if (location && day) {
      const slots = await fetchTimeSlotsAPI(
        location,
        day,
        date?.format("YYYY-MM-DD")
      );
      setTimeSlots(slots);
    } else {
      console.warn("Location or selectDay is missing.");
      setTimeSlots([]);
    }
  }, [location, day, date, setTimeSlots]);

  // Add new time slots according to Location , Day and Date Wise .....
  const handleAddTime = async () => {
    try {
      const response = await axios.post(
        "/api/schedule",
        {
          location,
          day,
          timeSlot: { time: customTime, date: formattedDate },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 201) {
        toast.success("New Time Added Successfully!");
        fetchTimeSlots();
        setShowTimeSelector(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add new time");
    }
  };

  useEffect(() => {
    if (location && day) {
      fetchTimeSlots();
    }
  }, [location, day, date, fetchTimeSlots]);

  useEffect(() => {
    fetchSections();
    fetchDoctors();
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      fetchDoctors(selectedSection);
    }
  }, [selectedSection]);

  return (
    <div className="w-full overflow-auto">
      <div className="mb-4">
        <Dialog open={isModalOpen} onOpenChange={handleModal}>
          <DialogContent className="min-w-[400px] max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {data ? "Update" : "Add"} New Appointment For{" "}
                {date?.format("D MMMM YYYY")} - {day}
              </DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                timeType: "select",
                date: data?.date || formattedDate,
                time: data?.time || "",
                patientName: data?.patientName || "",
                testType: isEco ? "Ecografie" : data?.testType || "",
                phoneNumber: data?.phoneNumber || "",
                notes: data?.notes || "",
                doctorName: isEco ? "-" : data?.doctorName || "",
                location: data?.location || location,
                isConfirmed: data?.isConfirmed ?? true,
                sectionId: data?.sectionId || "",
                doctorId: data?.doctorId || "",
              }}
              validationSchema={AppointmentSchema}
              onSubmit={handleAddOrUpdateAppointment}
            >
              {({ errors, touched, setFieldValue, values }) => (
                <Form className="space-y-4">
                  <div className="flex space-x-5 w-full">
                    <div className="w-1/2">
                      <Label htmlFor="patientName">Nume</Label>
                      <Field name="patientName" as={Input} id="patientName" />
                      {errors.patientName && touched.patientName && (
                        <div className="text-red-500">{errors.patientName}</div>
                      )}
                    </div>
                    <div className="w-1/2">
                      <Label htmlFor="phoneNumber">Phone</Label>
                      <Field name="phoneNumber" as={Input} id="phoneNumber" />
                      {errors.phoneNumber && touched.phoneNumber && (
                        <div className="text-red-500">{errors.phoneNumber}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sectionId">SECTIE</Label>
                    {isEco ? (
                      <Field name="testType" as={Input} id="testType" />
                    ) : (
                      <Field
                        as="select"
                        name="sectionId"
                        id="sectionId"
                        onChange={(e: any) => {
                          const selectedSectionId = e.target.value;
                          const selectedSection = sections.find((s: any) => s._id === selectedSectionId);
                          setFieldValue("sectionId", selectedSectionId);
                          setFieldValue("testType", selectedSection?.name || "");
                          setSelectedSection(selectedSectionId);
                          setFieldValue("doctorId", ""); // Reset doctor when section changes
                          setFieldValue("doctorName", ""); // Reset doctor name
                        }}
                        value={values.sectionId}
                        className="block w-full p-2 border border-gray-300 rounded"
                      >
                        <option value="">Select Sectie</option>
                        {sections.map((section: any) => (
                          <option key={section._id} value={section._id}>
                            {section.name}
                          </option>
                        ))}
                      </Field>
                    )}
                    {errors.sectionId && touched.sectionId && (
                      <div className="text-red-500">{errors.sectionId}</div>
                    )}
                  </div>

                  {isEco ? (
                    <div>
                      <Label htmlFor="doctorName">Doctor</Label>
                      <Field name="doctorName" as={Input} id="doctorName" />
                      {errors.doctorName && touched.doctorName && (
                        <div className="text-red-500">{errors.doctorName}</div>
                      )}
                    </div>
                  ) : (
                    <>
                      {selectedSection && (
                        <div>
                          <Label htmlFor="doctorId">Doctor</Label>
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
                            className="block w-full p-2 border border-gray-300 rounded"
                          >
                            <option value="">Select a doctor</option>
                            {doctors.map((doctor: any) => (
                              <option key={doctor._id} value={doctor._id}>
                                {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
                              </option>
                            ))}
                          </Field>
                          {errors.doctorId && touched.doctorId && (
                            <div className="text-red-500">
                              {errors.doctorId}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <Label>Location</Label>
                    <div
                      role="group"
                      aria-labelledby="location-group"
                      className="flex space-x-5 border p-2 rounded-lg"
                    >
                      {locations.map((loc: any) => (
                        <label key={loc._id} className="flex items-center">
                          <Field
                            type="radio"
                            name="location"
                            value={loc.name}
                            className="mr-2"
                            checked={values.location === loc.name}
                          />
                          {loc.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="w-full flex space-x-10">
                    <div>
                      <Label htmlFor="time" className="pb-3">
                        Time
                      </Label>
                      <div className="flex items-center space-x-3">
                        {/* Time Type Selection */}
                        <label className="flex items-center">
                          <Field
                            type="checkbox"
                            name="timeType"
                            value="select"
                            className="w-4 h-4"
                            onChange={() => {
                              setShowTimeSelector(false);
                            }}
                            checked={showTimeSelector === false}
                          />
                          <span className="ml-2">Select Time</span>
                        </label>

                        {/* Add New Custom Type  */}
                        <label className="flex items-center">
                          <Field
                            type="checkbox"
                            name="timeType"
                            value="custom"
                            className="w-4 h-4"
                            onChange={() => {
                              setShowTimeSelector(true);
                            }}
                            checked={showTimeSelector === true}
                          />
                          <span className="ml-2">
                            Add New Custom Time Schedule
                          </span>
                        </label>
                      </div>

                      {/* Time Input */}
                      {showTimeSelector ? (
                        <div className="mt-5">
                          <span className="text-[12px] text-gray-500 ">
                            <span className="font-semibold text-red-500">
                              ***
                            </span>
                            This is temporary time schedule. <br /> This is
                            applicalable for :{" "}
                            <span className="font-bold text-[14px]">
                              {formattedDate}
                            </span>{" "}
                            date
                            <span className="font-semibold text-red-500">
                              {" "}
                              ***
                            </span>
                          </span>
                          <div className="flex space-x-2 items-center justify-center mt-2">
                            <input
                              name="time"
                              type="time"
                              id="time"
                              className="mt-2 w-full flex px-5 py-2 border rounded-lg "
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                setCustomTime(e.target.value);
                              }}
                              value={customTime || ""}
                            />
                            <button
                              className={`bg-gray-800 hover:bg-gray-700 items-center rounded-lg px-3 py-2 mt-2 text-white text-sm ${
                                !customTime
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`} // Disable if no time is entered
                              onClick={handleAddTime}
                              disabled={!customTime} // Disable the Save button if no custom time is input
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid lg:grid-cols-8 md:grid-cols-6  grid-cols-4 gap-2 mt-5">
                          {timeSlots.map((slot: any) => {
                            // Check if the timeslot is booked in the appointment data
                            const isBooked = appointments.some(
                              (appointment:any) => appointment.time === slot.time
                            );

                            return (
                              <button
                                key={slot.time}
                                type="button"
                                className={`px-3 py-2 rounded-lg transition-colors duration-200 cursor-pointer hover:bg-blue-200 hover:text-black ${
                                  selectTime?.time === slot.time
                                    ? "bg-blue-500 text-white"
                                    : isBooked
                                    ? "bg-red-200 text-gray-400 cursor-not-allowed"
                                    : "bg-gray-200"
                                }`}
                                onClick={() => {
                                  if (!isBooked) {
                                    setSelectTime(slot);
                                    setFieldValue("time", slot.time);
                                  }
                                }}
                                disabled={isBooked} // Disable button if the slot is booked
                              >
                                {slot?.time}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {errors.time && touched.time && (
                        <div className="text-red-500">{errors.time}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Observatii</Label>
                    <Field
                      as="textarea"
                      name="notes"
                      id="notes"
                      className="block w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <Label
                      htmlFor="isConfirmed"
                      className="text-[20px] font-bold text-blue-500"
                    >
                      {values?.isConfirmed ? (
                        <span className="text-red-500">Close Reservation</span>
                      ) : (
                        "Active Reservation"
                      )}{" "}
                    </Label>
                    <Field name="isConfirmed">
                      {({ field, form }: { field: any; form: any }) => (
                        <Switch
                          id="isConfirmed"
                          checked={field.value}
                          onCheckedChange={(checked: boolean) =>
                            form.setFieldValue("isConfirmed", checked)
                          }
                          color="red"
                          className="text-red-500"
                        />
                      )}
                    </Field>
                  </div>

                  <div className="flex space-x-5">
                    <Button
                      type="submit"
                      disabled={Object.keys(errors).length > 0}
                    >
                      {data ? "Update" : "Add"} Appointment
                    </Button>
                    <Button type="button" onClick={handleModal}>
                      Cancel
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
