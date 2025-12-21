import React, { useState } from 'react';
import { PlusCircle, Search, Trash2, Save } from 'lucide-react';
import { PersonalNote, Language } from '../types';
import { Modal } from './Modal';
import { translations } from '../services/translations';
import { getLocalYMD } from "../services/dateUtils"; // ajusta ruta
import { formatYMDForUI } from "../services/dateUtils";

interface PersonalNotesProps {
  personalNotes: PersonalNote[];
  setPersonalNotes: React.Dispatch<React.SetStateAction<PersonalNote[]>>;
  selectedNote: PersonalNote | null;
  setSelectedNote: (note: PersonalNote | null) => void;
  language: Language;
}

const normalizeText = (text: string) => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';

export const PersonalNotes: React.FC<PersonalNotesProps> = ({ personalNotes, setPersonalNotes, selectedNote, setSelectedNote, language }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[language];

  if (selectedNote) {
    return <NoteEditor note={selectedNote} setSelectedNote={setSelectedNote} setPersonalNotes={setPersonalNotes} language={language} />;
  }

 const handleAddNewNote = () => {
  const newNote: PersonalNote = {
    id: String(Date.now()),
    title: "",
    content: "",
    date: getLocalYMD(),
  };

  setPersonalNotes((prev) => [newNote, ...prev]);
  setSelectedNote(newNote);
};


  const filteredNotes = personalNotes.filter(note => 
    normalizeText(note.title).includes(normalizeText(searchQuery)) || 
    normalizeText(note.content).includes(normalizeText(searchQuery))
  );

  return (
    <div className="p-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t.notes_title}</h1>
        <button onClick={handleAddNewNote} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors active:scale-95">
            <PlusCircle size={24} />
        </button>
      </div>
      <div className="relative mb-6 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input 
            type="text" 
            placeholder={t.search_notes} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full border-2 border-transparent bg-white dark:bg-gray-800 shadow-sm rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 dark:text-white" 
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredNotes.map(note => (
          <div key={note.id} onClick={() => setSelectedNote(note)} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-700 transition-all h-48 flex flex-col justify-between group">
            <div>
                <h3 className={`font-bold text-gray-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 ${!note.title ? 'text-gray-400 italic' : ''}`}>
                    {note.title || t.untitled}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">{note.content || "..."}</p>
            </div>
            <p className="text-xs text-gray-400 font-medium">formatYMDForUI(note.date, language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-US")
 </p>
          </div>
        ))}
      </div>
    </div>
  );
};

function NoteEditor({
  note,
  setSelectedNote,
  setPersonalNotes,
  language,
}: {
  note: PersonalNote;
  setSelectedNote: (note: PersonalNote | null) => void;
  setPersonalNotes: React.Dispatch<React.SetStateAction<PersonalNote[]>>;
  language: Language;
}) {

  const [editedNote, setEditedNote] = useState(note);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const t = translations[language];

  const handleSave = () => {
    setPersonalNotes(prevNotes => {
      const exists = prevNotes.find(n => n.id === editedNote.id);
      if (exists) { return prevNotes.map(n => n.id === editedNote.id ? editedNote : n); }
      return [editedNote, ...prevNotes];
    });
    setSelectedNote(null);
  };

  const handleDeleteConfirm = () => {
    setPersonalNotes(prev => prev.filter(n => n.id !== note.id));
    setSelectedNote(null);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedNote(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t.confirm_delete_title}>
        <p className="text-gray-700 dark:text-gray-300">{t.confirm_delete_msg}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsDeleteModalOpen(false)} className="font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t.cancel}</button>
          <button onClick={handleDeleteConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 shadow-md">{t.delete}</button>
        </div>
      </Modal>
      
      <div className="p-6 animate-fade-in-right space-y-6 max-w-3xl mx-auto h-full flex flex-col">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedNote(null)} className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300 transition-colors">&larr; {t.back}</button>
          <div className="flex gap-2">
            <button onClick={() => setIsDeleteModalOpen(true)} className="text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={20} /></button>
            <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-all flex items-center gap-2">
                <Save size={18}/> {t.save}
            </button>
          </div>
        </div>
        
        <input 
            type="text" 
            name="title" 
            value={editedNote.title} 
            onChange={handleInputChange} 
            className="w-full text-3xl font-bold border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-blue-500 p-2 focus:outline-none bg-transparent transition-colors text-gray-800 dark:text-white placeholder-gray-300 dark:placeholder-gray-600" 
            placeholder={t.note_title_ph}
        />
        
        <textarea 
            name="content" 
            value={editedNote.content} 
            onChange={handleInputChange} 
            className="w-full flex-grow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-6 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 resize-none leading-relaxed text-lg text-gray-700 dark:text-gray-200 min-h-[50vh]" 
            placeholder={t.note_content_ph}
        ></textarea>
      </div>
    </>
  );
};