
# 100-Job RIASEC Matrix
# Format: {"name": "Job Name", "code": "R-I-A", "group": "Group Name"}

MAJORS_DB = [
      # KỸ THUẬT – CÔNG NGHIỆP – CÔNG NGHỆ
      { "name": "Kỹ sư Cơ khí", "code": "R-I-C", "group": "Kỹ thuật" },
      { "name": "Kỹ sư Điện – Điện tử", "code": "R-I-C", "group": "Kỹ thuật" },
      { "name": "Kỹ sư Tự động hóa", "code": "R-I-C", "group": "Kỹ thuật" },
      { "name": "Kỹ sư Xây dựng", "code": "R-I-C", "group": "Kỹ thuật" },
      { "name": "Kỹ sư Giao thông", "code": "R-I-C", "group": "Kỹ thuật" },
      { "name": "Kỹ sư Môi trường", "code": "I-R-S", "group": "Kỹ thuật" },
      { "name": "Kỹ thuật viên Cơ điện", "code": "R-C-I", "group": "Kỹ thuật" },
      { "name": "Công nghệ vật liệu", "code": "I-R-C", "group": "Kỹ thuật" },
      { "name": "Công nghệ ô tô", "code": "R-I-C", "group": "Kỹ thuật" },
      { "name": "Công nghệ kỹ thuật nhiệt", "code": "R-I-C", "group": "Kỹ thuật" },
      
      # CNTT – CHUYỂN ĐỔI SỐ
      { "name": "Công nghệ thông tin", "code": "I-R-C", "group": "CNTT" },
      { "name": "Khoa học máy tính", "code": "I-R-C", "group": "CNTT" },
      { "name": "Kỹ thuật phần mềm", "code": "I-R-C", "group": "CNTT" },
      { "name": "An toàn thông tin", "code": "I-R-C", "group": "CNTT" },
      { "name": "Trí tuệ nhân tạo", "code": "I-R-C", "group": "CNTT" },
      { "name": "Khoa học dữ liệu", "code": "I-R-C", "group": "CNTT" },
      { "name": "Lập trình viên", "code": "I-R-C", "group": "CNTT" },
      { "name": "Quản trị mạng", "code": "R-I-C", "group": "CNTT" },
      { "name": "Phân tích dữ liệu", "code": "I-C-R", "group": "CNTT" },
      { "name": "Thiết kế UI/UX", "code": "A-I-C", "group": "CNTT" },

      # KHOA HỌC – Y SINH – MÔI TRƯỜNG
      { "name": "Y đa khoa", "code": "I-S-R", "group": "Y Sinh" },
      { "name": "Điều dưỡng", "code": "S-I-R", "group": "Y Sinh" },
      { "name": "Dược học", "code": "I-C-R", "group": "Y Sinh" },
      { "name": "Xét nghiệm y học", "code": "I-R-C", "group": "Y Sinh" },
      { "name": "Công nghệ sinh học", "code": "I-R-C", "group": "Y Sinh" },
      { "name": "Khoa học môi trường", "code": "I-R-S", "group": "Y Sinh" },
      { "name": "Kỹ thuật y sinh", "code": "I-R-C", "group": "Y Sinh" },
      { "name": "Thú y", "code": "I-R-S", "group": "Y Sinh" },
      { "name": "Dinh dưỡng", "code": "I-S-C", "group": "Y Sinh" },
      { "name": "Y tế công cộng", "code": "S-I-C", "group": "Y Sinh" },

      # GIÁO DỤC – XÃ HỘI
      { "name": "Sư phạm Toán", "code": "S-I-C", "group": "Giáo dục" },
      { "name": "Sư phạm Ngữ văn", "code": "S-A-C", "group": "Giáo dục" },
      { "name": "Sư phạm Tiếng Anh", "code": "S-A-C", "group": "Giáo dục" },
      { "name": "Giáo dục mầm non", "code": "S-A-C", "group": "Giáo dục" },
      { "name": "Công tác xã hội", "code": "S-I-A", "group": "Xã hội" },
      { "name": "Tâm lý học", "code": "I-S-A", "group": "Xã hội" },
      { "name": "Xã hội học", "code": "I-S-C", "group": "Xã hội" },
      { "name": "Quản lý giáo dục", "code": "S-E-C", "group": "Giáo dục" },
      { "name": "Giáo dục đặc biệt", "code": "S-I-A", "group": "Giáo dục" },
      { "name": "Hướng nghiệp – tham vấn", "code": "S-I-A", "group": "Giáo dục" },

      # NGHỆ THUẬT – TRUYỀN THÔNG
      { "name": "Thiết kế đồ họa", "code": "A-C-I", "group": "Nghệ thuật" },
      { "name": "Truyền thông đa phương tiện", "code": "A-E-S", "group": "Truyền thông" },
      { "name": "Báo chí", "code": "A-S-E", "group": "Truyền thông" },
      { "name": "Quan hệ công chúng", "code": "E-S-A", "group": "Truyền thông" },
      { "name": "Marketing", "code": "E-A-C", "group": "Kinh tế" },
      { "name": "Quảng cáo", "code": "A-E-S", "group": "Truyền thông" },
      { "name": "Sản xuất phim", "code": "A-E-S", "group": "Nghệ thuật" },
      { "name": "Nhiếp ảnh", "code": "A-R-C", "group": "Nghệ thuật" },
      { "name": "Âm nhạc", "code": "A-R-S", "group": "Nghệ thuật" },
      { "name": "Mỹ thuật ứng dụng", "code": "A-C-R", "group": "Nghệ thuật" },

      # KINH TẾ – QUẢN LÝ
      { "name": "Quản trị kinh doanh", "code": "E-C-S", "group": "Kinh tế" },
      { "name": "Tài chính – Ngân hàng", "code": "C-E-I", "group": "Kinh tế" },
      { "name": "Kế toán", "code": "C-I-E", "group": "Kinh tế" },
      { "name": "Kiểm toán", "code": "C-I-E", "group": "Kinh tế" },
      { "name": "Thương mại điện tử", "code": "E-I-C", "group": "Kinh tế" },
      { "name": "Logistics", "code": "E-C-R", "group": "Kinh tế" },
      { "name": "Quản trị nhân sự", "code": "S-E-C", "group": "Quản lý" },
      { "name": "Kinh doanh quốc tế", "code": "E-S-C", "group": "Kinh tế" },
      { "name": "Quản trị khách sạn", "code": "E-S-C", "group": "Dịch vụ" },
      { "name": "Quản trị du lịch", "code": "E-S-A", "group": "Dịch vụ" },

      # PHÁP LUẬT – HÀNH CHÍNH
      { "name": "Luật", "code": "I-E-C", "group": "Pháp luật" },
      { "name": "Luật kinh tế", "code": "I-E-C", "group": "Pháp luật" },
      { "name": "Hành chính công", "code": "C-S-E", "group": "Hành chính" },
      { "name": "Quản lý nhà nước", "code": "E-C-S", "group": "Hành chính" },
      { "name": "Văn thư – lưu trữ", "code": "C-R-S", "group": "Hành chính" },
      { "name": "Thanh tra", "code": "I-E-C", "group": "Pháp luật" },
      { "name": "Quản lý đất đai", "code": "C-R-I", "group": "Quản lý" },
      { "name": "Quản lý đô thị", "code": "E-R-C", "group": "Quản lý" },
      { "name": "Công an", "code": "R-S-E", "group": "An ninh" },
      { "name": "Quân đội", "code": "R-S-E", "group": "An ninh" },

      # NÔNG NGHIỆP – KINH TẾ XANH
      { "name": "Nông học", "code": "R-I-C", "group": "Nông nghiệp" },
      { "name": "Công nghệ thực phẩm", "code": "I-R-C", "group": "Công nghệ" },
      { "name": "Lâm nghiệp", "code": "R-I-C", "group": "Nông nghiệp" },
      { "name": "Nuôi trồng thủy sản", "code": "R-I-C", "group": "Nông nghiệp" },
      { "name": "Kinh tế nông nghiệp", "code": "E-I-C", "group": "Kinh tế" },
      { "name": "Quản lý tài nguyên", "code": "I-R-C", "group": "Quản lý" },
      { "name": "Nông nghiệp công nghệ cao", "code": "I-R-C", "group": "Nông nghiệp" },
      { "name": "Bảo vệ thực vật", "code": "I-R-C", "group": "Nông nghiệp" },
      { "name": "Chăn nuôi", "code": "R-I-C", "group": "Nông nghiệp" },
      { "name": "Phát triển nông thôn", "code": "S-E-I", "group": "Xã hội" },

      # ỨNG DỤNG – DỊCH VỤ
      { "name": "Kỹ thuật viên điện", "code": "R-C-I", "group": "Kỹ thuật" },
      { "name": "Kỹ thuật viên CNTT", "code": "R-I-C", "group": "CNTT" },
      { "name": "Thiết kế nội thất", "code": "A-R-C", "group": "Nghệ thuật" },
      { "name": "Thiết kế thời trang", "code": "A-E-C", "group": "Nghệ thuật" },
      { "name": "Đầu bếp", "code": "R-A-C", "group": "Dịch vụ" },
      { "name": "Chăm sóc sắc đẹp", "code": "A-S-R", "group": "Dịch vụ" },
      { "name": "Hướng dẫn viên du lịch", "code": "S-A-E", "group": "Dịch vụ" },
      { "name": "Quản lý bán lẻ", "code": "E-C-S", "group": "Kinh tế" },
      { "name": "Sales kỹ thuật", "code": "E-R-C", "group": "Kinh tế" },
      { "name": "Digital marketing", "code": "E-A-C", "group": "Truyền thông" },

      # NGÀNH MỚI – XU HƯỚNG
      { "name": "Trí tuệ nhân tạo ứng dụng", "code": "I-R-C", "group": "CNTT" },
      { "name": "Phân tích kinh doanh", "code": "I-E-C", "group": "Kinh tế" },
      { "name": "Kinh tế số", "code": "E-I-C", "group": "Kinh tế" },
      { "name": "Fintech", "code": "I-E-C", "group": "Kinh tế" },
      { "name": "Edtech", "code": "I-S-C", "group": "Giáo dục" },
      { "name": "Công nghệ giáo dục", "code": "I-S-C", "group": "Giáo dục" },
      { "name": "Quản lý dự án", "code": "E-C-S", "group": "Quản lý" },
      { "name": "Khởi nghiệp đổi mới sáng tạo", "code": "E-A-I", "group": "Kinh tế" },
      { "name": "Kinh tế xanh", "code": "I-E-R", "group": "Kinh tế" },
      { "name": "Phát triển bền vững", "code": "I-S-R", "group": "Xã hội" }
    ]
