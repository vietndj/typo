document.addEventListener("DOMContentLoaded", () => {
    initEditorToggle();
    initGitHubEngine();
});

function initEditorToggle() {
    // Tạo lập nút bật tắt chế độ chỉnh sửa trực tiếp dưới góc phải
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = 'Chế Độ Sửa: 🔴 TẮT';
    toggleBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #222; color: white; border: 1px solid #444; padding: 12px 24px; border-radius: 50px; cursor: pointer; z-index: 100000; font-size: 13px; font-weight: bold; transition: all 0.3s;';
    document.body.appendChild(toggleBtn);

    let isEditMode = false;
    const editables = document.querySelectorAll('.editable');
    const toolbar = document.getElementById('inline-toolbar');
    let activeElement = null;

    toggleBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            toggleBtn.innerHTML = 'Chế Độ Sửa: 🟢 BẬT';
            toggleBtn.style.background = '#00F0FF';
            toggleBtn.style.color = '#000';
            toggleBtn.style.borderColor = '#00F0FF';
            editables.forEach(el => el.setAttribute('contenteditable', 'true'));
        } else {
            toggleBtn.innerHTML = 'Chế Độ Sửa: 🔴 TẮT';
            toggleBtn.style.background = '#222';
            toggleBtn.style.color = 'white';
            toggleBtn.style.borderColor = '#444';
            editables.forEach(el => el.removeAttribute('contenteditable'));
            toolbar.classList.add('hidden');
        }
    });

    const styleSelector = document.getElementById('style-selector');
    editables.forEach(el => {
        el.addEventListener('focus', (e) => {
            if (!isEditMode) return;
            activeElement = e.target;
            const rect = activeElement.getBoundingClientRect();
            toolbar.classList.remove('hidden');
            toolbar.style.top = `${rect.top + window.scrollY - 40}px`;
            toolbar.style.left = `${rect.left + window.scrollX}px`;

            styleSelector.value = '';
            ['ds-tagline', 'ds-display', 'ds-headline', 'ds-subheadline', 'ds-body'].forEach(cls => {
                if(activeElement.classList.contains(cls)) styleSelector.value = cls;
            });
        });
    });

    styleSelector.addEventListener('change', () => {
        if (!activeElement) return;
        ['ds-tagline', 'ds-display', 'ds-headline', 'ds-subheadline', 'ds-body'].forEach(cls => activeElement.classList.remove(cls));
        if (styleSelector.value) activeElement.classList.add(styleSelector.value);
    });
}

function initGitHubEngine() {
    const saveGithubBtn = document.getElementById('github-save-btn');
    
    // Đọc thông số cũ lưu tại máy lên form nhập
    ['idx-gh-token', 'idx-gh-repo'].forEach(id => {
        if(localStorage.getItem(id)) document.getElementById(id).value = localStorage.getItem(id);
    });

    saveGithubBtn.addEventListener('click', async () => {
        const token = document.getElementById('idx-gh-token').value.trim();
        const repo = document.getElementById('idx-gh-repo').value.trim();

        if (!token || !repo) { alert('Vui lòng điền đủ Token và tên Repo trong form điều khiển!'); return; }
        
        localStorage.setItem('idx-gh-token', token);
        localStorage.setItem('idx-gh-repo', repo);

        saveGithubBtn.textContent = '⏳ ĐANG LƯU...';
        saveGithubBtn.disabled = true;

        try {
            const cloneDoc = document.documentElement.cloneNode(true);
            const uiWrapper = cloneDoc.querySelector('#editor-ui');
            if (uiWrapper) uiWrapper.remove();
            cloneDoc.body.lastElementChild.remove(); // Xóa nút bật tắt sửa

            cloneDoc.querySelectorAll('.editable').forEach(el => el.removeAttribute('contenteditable'));
            const cleanHtmlStr = '<!DOCTYPE html>\n' + cloneDoc.outerHTML;

            const url = `https://api.github.com/repos/${repo}/contents/index.html`;
            const resGet = await fetch(url, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
            let sha = resGet.ok ? (await resGet.json()).sha : null;

            const base64Content = btoa(unescape(encodeURIComponent(cleanHtmlStr)));
            const resPut = await fetch(url, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Cập nhật nội dung Landing Page qua CMS', content: base64Content, sha: sha, branch: 'main' })
            });

            if (resPut.ok) alert('🚀 THÀNH CÔNG: Nội dung mới đã được ghi đè an toàn lên GitHub!');
            else throw new Error("API GitHub từ chối xác thực. Kiểm tra lại phân quyền Token.");

        } catch (error) {
            alert('Lỗi: ' + error.message);
        } finally {
            saveGithubBtn.textContent = '⚡ LƯU LÊN GITHUB';
            saveGithubBtn.disabled = false;
        }
    });
}