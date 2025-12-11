"use client";

import { useEffect, useState, useCallback } from "react";

import TableComponent from "../common/table-component";
import CalendarGrid from "./calender-grid";
import AppointmentAddEdit from "./add-appointment";
import dayjs from "dayjs";
import { dayNameMap } from "@/lib/dayNameMap";
import Spinner from "../common/loader";
import EcoTable from "../common/EcoTable";
import Notes from "./Notes";
import { useTimeSlotStore } from "@/store/timeStore";
import { fetchAppointmentsAPI } from "@/service/appointmentService";
import { handleDownloadPDF, TestTypeSelectedRefresh } from "@/service/actionService";
import { fetchTimeSlotsAPI } from "@/service/scheduleService";
import AddAppointmentButton from "./AddButton";
import { sectionsApi, locationsApi, Section, Location } from "@/services/api";

const Dashboard = () => {
  const [location, setLocation] = useState<string>("");
  const [dayName, setDayName] = useState("");
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  
  // Initialize selectedDate on client side only to avoid hydration mismatch
  useEffect(() => {
    if (selectedDate === null) {
      setSelectedDate(dayjs());
    }
  }, [selectedDate]);
  const [editData, setEditData] = useState<any>(null);
  const [data, setAppointments] = useState<any>(null);
  const [selectedTestType, setSelectedTestType] = useState<string | null>(null);
  const [textareaContent, setTextareaContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const { setTimeSlots, timeSlots } = useTimeSlotStore();


  // Map the Normal Day with Romania Day name ...
  const selectDay =
    selectedDate?.format("dddd") && dayNameMap[selectedDate?.format("dddd")];

  // Get The Appointments by API Calling ....
  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = {
        date: selectedDate ? selectedDate.format("YYYY-MM-DD") : undefined,
        location,
        testType: selectedTestType,
      };

      // Make GET request with filters
      const data = await fetchAppointmentsAPI(filters);
      setAppointments(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setIsLoading(false);
    }
  }, [selectedDate, location, selectedTestType]);

  // Fetch sections from database based on selected location
  const fetchSections = useCallback(async () => {
    if (!location || locations.length === 0) {
      return;
    }

    try {
      setIsLoadingSections(true);
      // Find the locationId from the location name
      const selectedLocation = locations.find((loc: any) => loc.name === location);
      
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
      // Fallback to empty array if API fails
      setSections([]);
    } finally {
      setIsLoadingSections(false);
    }
  }, [location, locations]);

  // Fetch locations from database
  const fetchLocations = useCallback(async () => {
    try {
      setIsLoadingLocations(true);
      const response = await locationsApi.getAll();
      const loadedLocations = response.data.data || [];
      
      // Preselect the first active location if no location is selected
      let locationToSet = location;
      if (loadedLocations.length > 0 && !location) {
        const firstActiveLocation = loadedLocations.find((loc: any) => loc.isActive) || loadedLocations[0];
        if (firstActiveLocation) {
          locationToSet = firstActiveLocation.name;
        }
      }
      
      // Set locations first, then location, then fetch sections
      setLocations(loadedLocations);
      if (locationToSet !== location) {
        setLocation(locationToSet);
      }
      
      // Fetch sections after locations are set
      if (locationToSet && loadedLocations.length > 0) {
        const selectedLocation = loadedLocations.find((loc: any) => loc.name === locationToSet);
        if (selectedLocation) {
          const locationId = selectedLocation._id?.toString() || selectedLocation._id;
          try {
            // Try fetching with locationId first
            const apiOptions: { activeOnly: boolean; locationId?: string } = { 
              activeOnly: true
            };
            
            if (locationId) {
              apiOptions.locationId = locationId;
            }
            
            let sectionsResponse = await sectionsApi.getAll(apiOptions);
            let sectionsData = sectionsResponse.data.data || [];
            
            // If no sections found with locationId, try fetching all active sections
            if (sectionsData.length === 0 && locationId) {
              sectionsResponse = await sectionsApi.getAll({ activeOnly: true });
              sectionsData = sectionsResponse.data.data || [];
            }
            
            setSections(sectionsData);
          } catch (sectionsError) {
            console.error("Error fetching sections:", sectionsError);
            setSections([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      // Fallback to static data if API fails
      const fallbackLocations = [
        { _id: '1', name: 'Beiuș', isActive: true },
        { _id: '2', name: 'Oradea', isActive: true }
      ];
      setLocations(fallbackLocations);
      
      // Preselect first location from fallback
      let locationToSet = location;
      if (fallbackLocations.length > 0 && !location) {
        locationToSet = fallbackLocations[0].name;
        setLocation(locationToSet);
      }
      
      // Fetch sections for fallback location
      if (locationToSet && fallbackLocations.length > 0) {
        const selectedLocation = fallbackLocations.find((loc: any) => loc.name === locationToSet);
        if (selectedLocation) {
          const locationId = selectedLocation._id?.toString() || selectedLocation._id;
          try {
            // Try fetching with locationId first
            const apiOptions: { activeOnly: boolean; locationId?: string } = { 
              activeOnly: true
            };
            
            if (locationId) {
              apiOptions.locationId = locationId;
            }
            
            let sectionsResponse = await sectionsApi.getAll(apiOptions);
            let sectionsData = sectionsResponse.data.data || [];
            
            // If no sections found with locationId, try fetching all active sections
            if (sectionsData.length === 0 && locationId) {
              sectionsResponse = await sectionsApi.getAll({ activeOnly: true });
              sectionsData = sectionsResponse.data.data || [];
            }
            
            setSections(sectionsData);
          } catch (sectionsError) {
            console.error("Error fetching sections:", sectionsError);
            setSections([]);
          }
        }
      }
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchAppointments();
    }
  }, [selectedDate, location, selectedTestType, fetchAppointments]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Fetch sections when location changes and locations are loaded
  useEffect(() => {
    if (locations.length > 0 && location) {
      fetchSections();
    }
  }, [location, locations, fetchSections]);

  // According to Location and Day Name Get the timeSlots....
  const fetchTimeSlots = useCallback(async () => {
    if (location && selectDay) {
      try {
        setIsLoadingTimeSlots(true);
        const slots = await fetchTimeSlotsAPI(location, selectDay,selectedDate?.format("YYYY-MM-DD"));
        setTimeSlots(slots);
      } catch (error) {
        console.error("Error fetching time slots:", error);
        setTimeSlots([]);
      } finally {
        setIsLoadingTimeSlots(false);
      }
    } else {
      setTimeSlots([]);
    }
  }, [location, selectDay, selectedDate, setTimeSlots]);

  // For EcoTable Fetch The Time Slot Initiallly when select Ecografie Tab ...
  useEffect(() => {
    if (selectedTestType === "Ecografie" && selectedDate) {
      fetchTimeSlots();
    }
  }, [location, selectDay, selectedTestType, selectedDate, data, fetchTimeSlots]);


  // Handle The Tab Selection ...
  const handleTestTypeSelection = (testType: string | null) => {
    setSelectedTestType(testType);
    TestTypeSelectedRefresh(testType);
  };

  // Persist selectedTestType in local storage
  useEffect(() => {
    const savedTestType = localStorage.getItem("selectedTestType");
    if (savedTestType) {
      setSelectedTestType(savedTestType);
    }
  }, []);

  // Table Actions ........................................

  // Handle View Function ....
  const handleView = (appointment: any) => {
    alert(`Vizualizare programare pentru ${appointment.name} ${appointment.surname}`);
  };

  // Handle Edit Function ...
  const handleEdit = async (appointment: any) => {
    if (!selectedDate) {
      alert(`Vă rugăm să selectați data.`);
    } else {
      await setEditData(appointment);
      setIsModalOpen(true);
    }
  };

  // Modal Actions ........................
  const handleModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  const handleAddAppointment = () => {
    setIsModalOpen(true);
  };

  // Show initial loading state while locations are being fetched
  if (isLoadingLocations && locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <div className="w-full max-w-7xl p-5 space-y-4 bg-gray-100 rounded-md shadow-md py-5 flex justify-center items-center min-h-[400px]">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start  bg-gray-200 py-5">
      <div className="w-full max-w-7xl p-5 space-y-4 bg-gray-100 rounded-md shadow-md py-5 ">
        <div className="flex justify-between ">
          <p>Listă secții:</p>
          <div className="flex items-center gap-2">
            {isLoadingSections && (
              <Spinner />
            )}
            <p className="text-sm text-gray-500">Secții: {sections?.length || 0} | Locație: {location}</p>
          </div>
        </div>
        {isLoadingSections ? (
          <div className="w-full flex justify-center items-center px-5 mb-3 py-4">
            <Spinner />
          </div>
        ) : (
          <div className="w-full flex justify-start mb-3 gap-3">
          <div
            className={`cursor-pointer flex justify-center items-center px-4 py-1 text-white text-[15px] font-medium rounded-md text-center ${
              selectedTestType === null
                ? "bg-green-500"
                : "bg-indigo-500 hover:bg-green-500"
            }`}
            onClick={() => handleTestTypeSelection(null)}
          >
            Toate
          </div>
          {sections?.find((section: any) => section.name === "Ecografie") && (
            <div
              className={`cursor-pointer flex justify-center items-center py-1 text-white px-4 text-[15px] font-medium rounded-md text-center ${
                selectedTestType === "Ecografie"
                  ? "bg-green-500"
                  : "bg-indigo-500 hover:bg-green-500"
              }`}
              onClick={() => handleTestTypeSelection("Ecografie")}
            >
              Ecografie
            </div>
          )}
          </div>
        )}
        {isLoadingSections ? (
          <div className="w-full bg-white flex justify-center items-center gap-3 p-5 min-h-[60px]">
            <Spinner />
          </div>
        ) : (
          <div className="w-full grid lg:grid-cols-5 md:grid-cols-3 grid-cols-2 gap-3">
          {sections?.filter((section: any) => section.name !== "Ecografie").map((section: any, index) => (
            <div
              className={`cursor-pointer flex justify-center items-center py-1 text-white px-4 text-[15px] font-medium rounded-md  text-center ${
                selectedTestType === section.name
                  ? "bg-green-500"
                  : "bg-indigo-500 hover:bg-green-500"
              }`}
              key={section._id || index}
              onClick={() => handleTestTypeSelection(section.name)}
            >
              {section?.name}
            </div>
          ))}
          </div>
        )}
        {isLoadingLocations ? (
          <div className="w-full flex justify-center items-center py-10">
            <Spinner />
          </div>
        ) : (
          <CalendarGrid
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          location={location}
          setLocation={setLocation}
          dayName={dayName}
          setDayName={setDayName}
          locations={locations}
        />
        )}
        <div className="w-full text-center text-[18px] font-semibold py-2 border-t pt-5">
          {location} - {selectDay},{" "}
          {selectedDate?.format("D MMMM YYYY") ||
            "Nu a fost selectată nicio dată"}
        </div>
        <div className="w-full flex justify-between lg:px-10 px-5 ">
          <AddAppointmentButton
            selectedDate={selectedDate}
            onClick={handleAddAppointment}
          />

          <button
            className="bg-blue-500 hover:bg-blue-400 text-white rounded px-4 py-1"
            onClick={() =>
              handleDownloadPDF(
                data,
                location,
                selectDay,
                selectedDate,
                textareaContent
              )
            }
          >
            Descarcă PDF
          </button>
        </div>
        {isLoading ? (
          <div className="py-5 bg-white rounded-md flex justify-center items-start pt-20 min-h-screen w-[100%]">
            <Spinner />
          </div>
        ) : (
          <>
            {selectedTestType === "Ecografie" ? (
              <div>
                {isLoadingTimeSlots ? (
                  <div className="py-5 bg-white rounded-md flex justify-center items-center min-h-[200px]">
                    <Spinner />
                  </div>
                ) : (
                  <EcoTable
                    timeSlots={timeSlots}
                    appointments={data || []}
                    onView={handleView}
                    onEdit={handleEdit}
                    fetchData={fetchAppointments}
                  />
                )}
              </div>
            ) : (
              <TableComponent
                appointments={data || []}
                onView={handleView}
                onEdit={handleEdit}
                fetchData={fetchAppointments}
              />
            )}
          </>
        )}

        <Notes
          selectedDate={selectedDate}
          location={location}
          textareaContent={textareaContent}
          setTextareaContent={setTextareaContent}
        />
      </div>
      <AppointmentAddEdit
        isModalOpen={isModalOpen}
        handleModal={handleModal}
        isEco={selectedTestType === "Ecografie"}
        date={selectedDate}
        day = {selectDay}
        location={location}
        appointments = {data}
        fetchAppointments={fetchAppointments}
        data={editData ? editData : null}

      />
    </div>
  );
};

export default Dashboard;
