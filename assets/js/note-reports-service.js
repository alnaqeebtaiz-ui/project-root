// assets/js/note-reports-service.js
const API_BASE_URL = 'https://alnaqeeb.onrender.com/api/funds-reports'; // 👈 استبدل هذا برابط الـ Backend الخاص بك على RENDER

new Vue({
    el: '#app',
    data() {
        return {
            activeReport: 'overview',
            collectors: [],
            loadingCollectors: false,

            overviewFilters: {
                collectorId: '',
                notebookStatus: 'all',
                hasMissing: '',
                hasPending: '',
            },
            overviewReport: [],
            loadingOverview: false,

            missingDetailsFilters: {
                collectorId: '',
                searchText: '',
            },
            missingDetailsReport: [],
            loadingMissingDetails: false,
        };
    },
    async created() {
        await this.fetchCollectors();
        this.fetchOverviewReport();
    },
    methods: {
        async fetchCollectors() {
            this.loadingCollectors = true;
            try {
                const response = await axios.get(`${API_BASE_URL}/note-reports/collectors`);
                this.collectors = response.data;
            } catch (error) {
                console.error('Error fetching collectors:', error);
                alert('خطأ في جلب المحصلين: ' + (error.response?.data?.msg || error.message));
            } finally {
                this.loadingCollectors = false;
            }
        },
        async fetchOverviewReport() {
            this.loadingOverview = true;
            try {
                const params = { ...this.overviewFilters };
                const response = await axios.get(`${API_BASE_URL}/note-reports/notebook-overview`, {
                    params,
                });
                this.overviewReport = response.data;
            } catch (error) {
                console.error('Error fetching overview report:', error);
                alert('خطأ في جلب تقرير نظرة عامة: ' + (error.response?.data?.msg || error.message));
            } finally {
                this.loadingOverview = false;
            }
        },
        async fetchMissingDetailsReport() {
            this.loadingMissingDetails = true;
            try {
                const params = { ...this.missingDetailsFilters };
                const response = await axios.get(`${API_BASE_URL}/note-reports/missing-receipts-details`, {
                    params,
                });
                this.missingDetailsReport = response.data;
            } catch (error) {
                console.error('Error fetching missing details report:', error);
                alert('خطأ في جلب تقرير تفاصيل السندات المفقودة: ' + (error.response?.data?.msg || error.message));
            } finally {
                this.loadingMissingDetails = false;
            }
        },
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const options = { year: 'numeric', month: 'short', 'day': 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateString).toLocaleDateString('ar-SA', options);
        }
    }
});