import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";
import Spinner from "../common/loader";

interface NotesProps {
  selectedDate: dayjs.Dayjs | null;
  location: string;
  textareaContent:string; 
  setTextareaContent:any;
}

const Notes: React.FC<NotesProps> = ({ selectedDate, location,textareaContent,setTextareaContent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  const fetchNotes = useCallback(async (date: string, location: string) => {
    try {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`/api/notes`, {
        params: { date, location },
        headers,
      });

      if (response.data?.success && response?.data?.data?.length > 0) {
        const note = response?.data?.data[0];
        setTextareaContent(note?.notes || "");
        setNoteId(note._id);
      } else {
        setTextareaContent("");
        setNoteId(null);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [setTextareaContent]);

  useEffect(() => {
    if (selectedDate && location) {
      fetchNotes(selectedDate.format("YYYY-MM-DD"), location);
    }
  }, [selectedDate, location, fetchNotes]);

  const handleAddOrUpdateNotes = async () => {
    if (!textareaContent.trim()) {
      toast.error("Please enter some content.");
      return;
    }

    try {
      setIsLoading(true);

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      if (noteId) {
        // Update existing note
        await axios.patch(
          `/api/notes?id=${noteId}`,
          { notes: textareaContent },
          { headers }
        );
        toast.success("Notes updated successfully.");
      } else {
        // Add new note
        const response = await axios.post(
          `/api/notes`,
          {
            date: selectedDate?.format("YYYY-MM-DD"),
            location:location,
            notes: textareaContent,
          },
          { headers }
        );
        setNoteId(response.data.data._id);
        toast.success("Notes created successfully.");
      }
    } catch (error) {
      toast.error("Error saving notes.");
      console.error("Error saving notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex lg:flex-row flex-col justify-center items-center space-x-5 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-md">
          <Spinner />
        </div>
      )}
      <textarea
        className="w-full m-auto h-40 rounded-sm lg:px-10 px-5 mb-2 py-2 mt-5"
        value={textareaContent}
        onChange={(e) => setTextareaContent(e.target.value)}
        disabled={isLoading}
        placeholder="Write your notes here..."
      />
      <button
        className={`${
          noteId ? "bg-green-500" : "bg-blue-500"
        } text-white px-4 py-2 rounded lg:w-40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={handleAddOrUpdateNotes}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Se salvează...
          </>
        ) : noteId ? (
          "Update Notes"
        ) : (
          "Add Notes"
        )}
      </button>
    </div>
  );
};

export default Notes;
