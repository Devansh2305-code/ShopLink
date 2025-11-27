const API_BASE_URL = 'https://shoplink-api.onrender.com/api';

export function showMessage(message, type = 'success') {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const color = type === 'error' ? 'bg-red-500' : (type === 'warning' ? 'bg-yellow-500' : 'bg-green-500');

    const modalHtml = `
        <div class="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end">
            <div class="max-w-sm w-full ${color} text-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div class="p-4">
                    <p class="text-sm font-medium">${message}</p>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = modalHtml;
    setTimeout(() => {
        if (container) container.innerHTML = '';
    }, 3000);
}

export async function secureFetch(endpoint, options = {}, retries = 3) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const currentToken = localStorage.getItem('token');
    if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
    }

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = response.status === 204 ? { message: 'Success' } : await response.json();
            
            if (response.ok) {
                return { ok: true, data: data, status: response.status };
            } else {
                if (response.status === 401 || response.status === 403) {
                    showMessage(data.message || 'Session expired. Please log in.', 'error');
                    // In a React app, you'd typically redirect or use context to log out
                    // For now, we can clear localStorage and reload.
                    localStorage.clear();
                    window.location.reload();
                } else {
                    showMessage(data.message || `API Error: ${response.status}`, 'error');
                }
                return { ok: false, data: data, status: response.status };
            }
        } catch (error) {
            if (i >= retries - 1) {
                showMessage(`Network connection failed after ${retries} attempts.`, 'error');
                return { ok: false, data: { message: "Network error" }, status: 500 };
            }
            await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
        }
    }
}