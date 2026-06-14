// =========================================================
// CONFIG: KHAI BÁO CÁC FONT TRONG THƯ MỤC fonts/ CỦA BẠN TẠI ĐÂY
// =========================================================
const LOCAL_FONTS = [
    { name: 'Oswald-Bold', file: 'Oswald-Bold.ttf' },
    { name: 'Merriweather-Black', file: 'Merriweather-Black.woff2' },
    { name: 'SpaceGrotesk-Regular', file: 'SpaceGrotesk-Regular.woff2' }
];

document.addEventListener("DOMContentLoaded", () => {
    initFontSystem();
    initInlineEditor();
    initGitHubEngine();
});

// 1. TỰ ĐỘNG NẠP CÁC FILE FONT TRONG THƯ MỤC VÀO HỆ THỐNG
function initFontSystem() {
    const fontSelector = document.getElementById('font-selector');
    const head = document.head;

    LOCAL_FONTS.forEach(font => {
        // Tạo quy tắc @font-face động chèn vào header
        const fontStyle = document.createElement('style');
        fontStyle.textContent = `
            @font-face {
                font-family: '${font.name}';
                src: url('fonts/${font.file}');
                font-display: swap;
            }
        `;
        head.appendChild(fontStyle);

        // Đẩy tên font vào dropdown điều khiển
        const option = document.createElement('option');
        option.value = font.name;
        option.textContent = font.name;
        fontSelector.appendChild(option);
    });
}

// 2. CƠ CHẾ INLINE EDITOR (BẬT TÍNH NĂNG CLICK ĐỂ SỬA TEXT TRỰC TIẾP)
function initInlineEditor() {
    const editables = document.querySelectorAll('.editable');
    const toolbar = document.getElementById('inline-toolbar');
    const styleSelector = document.getElementById('style-selector');
    const fontSelector = document.getElementById('font-selector');
    let activeElement = null;

    editables.forEach(el => {
        el.setAttribute('contenteditable', 'true');
        
        el.addEventListener('focus', (e) => {
            activeElement = e.target;
            positionToolbar(activeElement);
            
            // Đọc các class hiện tại để đồng bộ trạng thái dropdown chọn style
            styleSelector.value = '';
            ['ds-tagline', 'ds-display', 'ds-headline', 'ds-subheadline', 'ds-body'].forEach(cls => {
                if(activeElement.classList.contains(cls)) styleSelector.value = cls;
            });
            fontSelector.value = activeElement.style.fontFamily.replace(/['"]/g, '') || '';
        });

        el.addEventListener('blur', () => {
            // Đóng tạm toolbar khi click ra ngoài (trừ khi click vào chính toolbar)
            setTimeout(() => {
                if (document.activeElement !== styleSelector && document.activeElement !== fontSelector) {
                    toolbar.classList.add('hidden');
                }
            }, 200);
        });
    });

    function positionToolbar(el) {
        const rect = el.getBoundingClientRect();
        toolbar.classList.remove('hidden');
        toolbar.style.top = `${rect.top + window.scrollY - 45}px`;
        toolbar.style.left = `${rect.left + window.scrollX}px`;
    }

    // Xử lý đổi Style Kiểu chữ từ Design System
    styleSelector.addEventListener('change', () => {
        if (!activeElement) return;
        ['ds-tagline', 'ds-display', 'ds-headline', 'ds-subheadline', 'ds-body'].forEach(cls => {
            activeElement.classList.remove(cls);
        });
        if (styleSelector.value) activeElement.classList.add(styleSelector.value);
    });

    // Xử lý đổi Font chữ cục bộ
    fontSelector.addEventListener('change', () => {
        if (!activeElement) return;
        activeElement.style.fontFamily = fontSelector.value ? `'${fontSelector.value}'` : '';
    });
}

// 3. ENGINE KẾT NỐI VÀ SUBMIT CODE SẠCH LÊN GITHUB API
function initGitHubEngine() {
    const toggleBtn = document.getElementById('toggle-config-btn');
    const configPanel = document.getElementById('config-panel');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const saveGithubBtn = document.getElementById('github-save-btn');

    // Tải thông tin config cũ từ localStorage nếu có
    ['gh-token', 'gh-repo', 'gh-branch', 'gh-path'].forEach(id => {
        if(localStorage.getItem(id)) document.getElementById(id).value = localStorage.getItem(id);
    });

    toggleBtn.addEventListener('click', () => configPanel.classList.toggle('hidden'));
    
    saveConfigBtn.addEventListener('click', () => {
        ['gh-token', 'gh-repo', 'gh-branch', 'gh-path'].forEach(id => {
            localStorage.setItem(id, document.getElementById(id).value.trim());
        });
        alert('Đã lưu cấu hình phân mảnh GitHub tạm thời!');
        configPanel.classList.add('hidden');
    });

    saveGithubBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('gh-token');
        const repo = localStorage.getItem('gh-repo');
        const branch = localStorage.getItem('gh-branch') || 'main';
        const path = localStorage.getItem('gh-path') || 'index.html';

        if (!token || !repo) {
            alert('Lỗi: Hãy click vào bánh răng để nhập Token và Repo trước khi lưu!');
            configPanel.classList.remove('hidden');
            return;
        }

        saveGithubBtn.textContent = '⏳ ĐANG LỌC VÀ ĐẨY CODE...';
        saveGithubBtn.disabled = true;

        try {
            // Bước A: Tạo bản sao DOM ảo để tiến hành thanh lọc mã nguồn trước khi đóng gói
            const cloneDoc = document.documentElement.cloneNode(true);
            
            // Xóa bỏ hoàn toàn panel quản lý điều khiển UI
            const uiWrapper = cloneDoc.querySelector('#editor-ui');
            if (uiWrapper) uiWrapper.remove();

            // Loại bỏ thuộc tính contenteditable và các viền hover thiết kế khỏi toàn bộ các phần tử
            cloneDoc.querySelectorAll('.editable').forEach(el => {
                el.removeAttribute('contenteditable');
                if(el.getAttribute('class') === 'editable') el.removeAttribute('class'); // clear class rỗng nếu có
            });

            const cleanHtmlStr = '<!DOCTYPE html>\n' + cloneDoc.outerHTML;

            // Bước B: Gọi API GitHub lấy mã SHA hiện tại của file để ghi đè (Tránh trùng lặp)
            const url = `https://api.github.com/repos/${repo}/contents/${path}`;
            let sha = null;

            const resGet = await fetch(url, {
                headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
            });

            if (resGet.ok) {
                const dataGet = await resGet.json();
                sha = dataGet.sha;
            }

            // Bước C: Chuyển dữ liệu chuỗi HTML sang Base64 chuẩn UTF-8 và tiến hành PUT lên GitHub
            const base64Content = btoa(unescape(encodeURIComponent(cleanHtmlStr)));

            const resPut = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: 'Feat: Đồng bộ chỉnh sửa nội dung trực tiếp qua Giao diện CMS',
                    content: base64Content,
                    sha: sha,
                    branch: branch
                })
            });

            if (resPut.ok) {
                alert('🚀 HOÀN THÀNH: Nội dung mới đã được commit lên GitHub và đang đồng bộ lên Vercel!');
            } else {
                const errData = await resPut.json();
                alert(`Lỗi API GitHub: ${errData.message}`);
            }

        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối hệ thống, kiểm tra lại Internet hoặc Token của bạn!');
        } finally {
            saveGithubBtn.textContent = '⚡ TẢI LÊN GITHUB';
            saveGithubBtn.disabled = false;
        }
    });
}