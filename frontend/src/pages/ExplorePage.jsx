import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  Search,
  Code2,
  Github,
  Globe,
  UserPlus,
  Loader2,
  Filter,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const POPULAR_SKILLS = [
  "React", "Node.js", "Python", "TypeScript", "JavaScript",
  "Go", "Rust", "Java", "C++", "AI/ML",
  "Next.js", "Vue.js", "MongoDB", "PostgreSQL", "Docker",
  "AWS", "Flutter", "React Native", "GraphQL", "Kubernetes",
];

const EXPERIENCE_LEVELS = [
  { value: "", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const ExplorePage = () => {
  const { authUser } = useAuthStore();
  const [developers, setDevelopers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [experience, setExperience] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sendingRequest, setSendingRequest] = useState({});

  const searchDevelopers = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedSkills.length > 0) params.append("skills", selectedSkills.join(","));
      if (experience) params.append("experience", experience);
      params.append("page", pageNum);
      params.append("limit", 12);

      const res = await axiosInstance.get(`/developers/search?${params}`);
      setDevelopers(res.data.developers);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (error) {
      toast.error("Search failed");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    searchDevelopers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    searchDevelopers(1);
  };

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  useEffect(() => {
    searchDevelopers(1);
  }, [selectedSkills, experience]);

  const handleSendRequest = async (uniqueId) => {
    setSendingRequest((prev) => ({ ...prev, [uniqueId]: true }));
    try {
      const res = await axiosInstance.post("/friends/send", { uniqueId });
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
    setSendingRequest((prev) => ({ ...prev, [uniqueId]: false }));
  };

  return (
    <div className="min-h-screen bg-base-200 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Developer Network
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Find & Connect with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Developers
            </span>
          </h1>
          <p className="text-base-content/60 max-w-xl mx-auto">
            Search by skills, tech stack, or name. Connect and collaborate with developers worldwide.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
              <input
                type="text"
                className="input input-bordered w-full pl-10 pr-4"
                placeholder="Search developers by name, skills, or tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>

        {/* Filters */}
        <div className="max-w-5xl mx-auto mb-8">
          {/* Experience Level Filter */}
          <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
            <Filter className="w-4 h-4 text-base-content/50" />
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setExperience(level.value)}
                className={`btn btn-xs ${
                  experience === level.value ? "btn-primary" : "btn-ghost"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>

          {/* Skill Tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedSkills.includes(skill)
                    ? "bg-primary text-primary-content shadow-md"
                    : "bg-base-300 text-base-content/70 hover:bg-base-content/10"
                }`}
              >
                {skill}
                {selectedSkills.includes(skill) && (
                  <X className="w-3 h-3 inline ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="max-w-5xl mx-auto mb-4">
          <p className="text-sm text-base-content/50">
            {isLoading ? "Searching..." : `${total} developer${total !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Developer Cards Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : developers.length === 0 ? (
          <div className="text-center py-16">
            <Code2 className="w-12 h-12 mx-auto text-base-content/20 mb-3" />
            <p className="text-base-content/50">No developers found matching your search</p>
            <p className="text-sm text-base-content/30 mt-1">Try different keywords or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {developers.map((dev) => (
              <div
                key={dev._id}
                className="bg-base-100 rounded-xl border border-base-300 p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={dev.profilePic || "/avatar.png"}
                    alt={dev.fullName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-base-300 group-hover:ring-primary/30 transition-all"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{dev.fullName}</h3>
                    {dev.title && (
                      <p className="text-sm text-primary truncate">{dev.title}</p>
                    )}
                    {dev.experience && (
                      <span className="inline-block mt-0.5 text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {dev.experience}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {dev.bio && (
                  <p className="text-sm text-base-content/60 mb-3 line-clamp-2">{dev.bio}</p>
                )}

                {/* Skills */}
                {dev.skills && dev.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dev.skills.slice(0, 5).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-base-200 rounded-md text-[11px] font-medium text-base-content/70"
                      >
                        {skill}
                      </span>
                    ))}
                    {dev.skills.length > 5 && (
                      <span className="px-2 py-0.5 text-[11px] text-base-content/40">
                        +{dev.skills.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {/* Tech Stack */}
                {dev.techStack && dev.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dev.techStack.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 bg-secondary/10 rounded-md text-[11px] font-medium text-secondary"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Links + Connect */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-200">
                  <div className="flex gap-2">
                    {dev.github && (
                      <a
                        href={dev.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-xs btn-circle"
                        title="GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {dev.portfolio && (
                      <a
                        href={dev.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-xs btn-circle"
                        title="Portfolio"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleSendRequest(dev.uniqueId)}
                    className="btn btn-primary btn-xs gap-1"
                    disabled={sendingRequest[dev.uniqueId]}
                  >
                    {sendingRequest[dev.uniqueId] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" /> Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => searchDevelopers(page - 1)}
              disabled={page <= 1}
              className="btn btn-ghost btn-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="flex items-center px-3 text-sm text-base-content/60">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => searchDevelopers(page + 1)}
              disabled={page >= totalPages}
              className="btn btn-ghost btn-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
