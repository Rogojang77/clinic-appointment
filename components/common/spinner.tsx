import { Loader } from 'lucide-react';

const Spinner = ({ size = 24, color = '#ffffff' }) => {
  return (
    <div className="spinner-loader">
      <Loader size={size} color={color} className="animate-spin"/>
    </div>
  );
};

export default Spinner;