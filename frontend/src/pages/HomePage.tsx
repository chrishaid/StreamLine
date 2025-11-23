import { Plus, Upload, Clock, Star, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAppStore } from '../store/useAppStore';

export function HomePage() {
  const navigate = useNavigate();
  const { setCurrentBpmnXml, setCurrentProcess, clearChat } = useAppStore();

  const handleCreateNewProcess = () => {
    // Clear any existing process data
    setCurrentBpmnXml(null);
    setCurrentProcess(null);
    clearChat();

    // Navigate to editor
    navigate('/editor');
  };

  const handleUploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.bpmn20.xml,.xml';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          setCurrentBpmnXml(text);
          setCurrentProcess(null);
          clearChat();
          navigate('/editor');
        } catch (error) {
          console.error('Failed to load file:', error);
          alert('Failed to load BPMN file. Please check the file format.');
        }
      }
    };
    input.click();
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-8">
        {/* Welcome Section */}
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to StreamLine
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your AI-powered BPMN Process Hub for creating, managing, and optimizing business processes.
          </p>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <button
              onClick={handleCreateNewProcess}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 hover:border-primary transition-colors cursor-pointer group text-left w-full"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Create New Process
                  </h3>
                  <p className="text-sm text-gray-600">
                    Start a conversation with Claude to create a BPMN diagram
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleUploadFile}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 hover:border-primary transition-colors cursor-pointer group text-left w-full"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Upload BPMN File
                  </h3>
                  <p className="text-sm text-gray-600">
                    Import an existing .bpmn file to get started
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Recent Processes */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Recent Processes</h2>
              <button className="text-primary hover:text-primary-600 text-sm font-medium">
                View all →
              </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No recent processes yet</p>
              <p className="text-sm mt-2">Create your first process to get started</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Processes</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">No change from last month</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Active Processes</h3>
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">Ready to use</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Favorites</h3>
                <Star className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">Mark processes as favorites</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
