import React, { useState, useEffect } from 'react';
import { membersAPI, feesAPI } from '../services/api';
import { FiPlus, FiEdit2, FiX, FiDollarSign, FiCheck, FiTrash2 } from 'react-icons/fi';
import './MemberManagement.css';

const MemberManagement = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [borrowingHistory, setBorrowingHistory] = useState([]);
  const [fees, setFees] = useState([]);
  const [feeSummary, setFeeSummary] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [feeFormData, setFeeFormData] = useState({
    amount: '',
    description: '',
    loanID: ''
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    membershipType: 'Adult'
  });

  useEffect(() => {
    loadMembers();
  }, [searchTerm, membershipTypeFilter, statusFilter]);

  useEffect(() => {
    if (selectedMember && activeTab === 'history') {
      loadBorrowingHistory();
    }
    if (selectedMember && activeTab === 'fees') {
      loadMemberFees();
      loadFeeSummary();
    }
  }, [selectedMember, activeTab]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (membershipTypeFilter) params.membershipType = membershipTypeFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await membersAPI.getAll(params);
      setMembers(response.data);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBorrowingHistory = async () => {
    if (!selectedMember) return;
    try {
      const response = await membersAPI.getBorrowingHistory(selectedMember.userID);
      setBorrowingHistory(response.data);
    } catch (error) {
      console.error('Error loading borrowing history:', error);
    }
  };

  const loadMemberFees = async () => {
    if (!selectedMember) return;
    try {
      const response = await feesAPI.getMemberFees(selectedMember.userID);
      setFees(response.data);
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  };

  const loadFeeSummary = async () => {
    if (!selectedMember) return;
    try {
      const response = await feesAPI.getMemberSummary(selectedMember.userID);
      setFeeSummary(response.data);
    } catch (error) {
      console.error('Error loading fee summary:', error);
    }
  };

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setActiveTab('details');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (selectedMember) {
        await membersAPI.update(selectedMember.userID, formData);
      } else {
        const response = await membersAPI.create(formData);
        console.log('Member created:', response.data);
      }
      await loadMembers();
      setShowAddModal(false);
      if (selectedMember) {
        const updated = await membersAPI.getById(selectedMember.userID);
        setSelectedMember(updated.data);
      }
    } catch (error) {
      console.error('Error saving member:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save member';
      alert(errorMessage);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedMember) return;
    if (!window.confirm('Are you sure you want to deactivate this member?')) return;
    try {
      await membersAPI.deactivate(selectedMember.userID);
      await loadMembers();
      // Update selected member status
      const updated = await membersAPI.getById(selectedMember.userID);
      setSelectedMember(updated.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to deactivate member');
    }
  };

  const handleReactivate = async () => {
    if (!selectedMember) return;
    if (!window.confirm('Are you sure you want to reactivate this member?')) return;
    try {
      await membersAPI.reactivate(selectedMember.userID);
      await loadMembers();
      // Update selected member status
      const updated = await membersAPI.getById(selectedMember.userID);
      setSelectedMember(updated.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reactivate member');
    }
  };

  const handlePayFee = async (fineID, amount) => {
    if (!window.confirm(`Pay fee of $${amount.toFixed(2)}?`)) return;
    try {
      await feesAPI.payFee(fineID, { amount });
      await loadMemberFees();
      await loadFeeSummary();
      alert('Fee paid successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to pay fee');
    }
  };

  const handleAddFee = async () => {
    if (!feeFormData.amount) {
      alert('Please enter an amount');
      return;
    }
    try {
      await feesAPI.addFee({
        userID: selectedMember.userID,
        loanID: feeFormData.loanID || null,
        amount: parseFloat(feeFormData.amount),
        description: feeFormData.description
      });
      await loadMemberFees();
      await loadFeeSummary();
      setShowAddFeeModal(false);
      setFeeFormData({ amount: '', description: '', loanID: '' });
      alert('Fee added successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add fee');
    }
  };

  const handleDeleteFee = async (fineID) => {
    if (!window.confirm('Are you sure you want to delete this fee?')) return;
    try {
      await feesAPI.deleteFee(fineID);
      await loadMemberFees();
      await loadFeeSummary();
      alert('Fee deleted successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete fee');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      approved: { label: 'Active', class: 'status-active' },
      suspended: { label: 'Suspended', class: 'status-suspended' },
      expired: { label: 'Expired', class: 'status-expired' },
      pending: { label: 'Pending', class: 'status-pending' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  return (
    <div className="member-management">
      <div className="member-layout">
        <div className="main-content">
          <div className="page-header">
            <div>
              <h1>Member Management</h1>
              <p>Manage member accounts, view borrowing history, and update details.</p>
            </div>
            <button className="btn-primary" onClick={() => {
              setShowAddModal(true);
              setSelectedMember(null);
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: '',
                membershipType: 'Adult'
              });
            }}>
              <FiPlus /> Add New Member
            </button>
          </div>
          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by name, member ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={membershipTypeFilter} onChange={(e) => setMembershipTypeFilter(e.target.value)}>
              <option value="">All Membership Types</option>
              <option value="Adult">Adult</option>
              <option value="Student">Student</option>
              <option value="Child">Child</option>
              <option value="Senior">Senior</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="approved">Active</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">Loading members...</div>
          ) : (
            <>
              <div className="members-table">
                <table>
                  <thead>
                    <tr>
                      <th>Member Name</th>
                      <th>Membership ID</th>
                      <th>Membership Type</th>
                      <th>Join Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr
                        key={member.userID}
                        className={selectedMember?.userID === member.userID ? 'selected' : ''}
                        onClick={() => handleMemberClick(member)}
                      >
                        <td>{member.firstName} {member.lastName}</td>
                        <td>{member.membershipID}</td>
                        <td>{member.membershipType}</td>
                        <td>{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '-'}</td>
                        <td>{getStatusBadge(member.status)}</td>
                        <td>
                          <button className="icon-btn">
                            <FiEdit2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <span>Showing 1 to {members.length} of {members.length} members</span>
              </div>
            </>
          )}
        </div>

        {selectedMember && (
          <div className="details-panel">
            <div className="member-header">
              <div className="member-avatar">
                {selectedMember.firstName[0]}{selectedMember.lastName[0]}
              </div>
              <div>
                <h3>{selectedMember.firstName} {selectedMember.lastName}</h3>
                <p className="member-id">{selectedMember.membershipID}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  {getStatusBadge(selectedMember.status)}
                </div>
              </div>
            </div>

            <div className="member-actions">
              <button className="btn-secondary" onClick={() => {
                setFormData({
                  firstName: selectedMember.firstName,
                  lastName: selectedMember.lastName,
                  email: selectedMember.email,
                  phone: selectedMember.phone || '',
                  address: selectedMember.address || '',
                  membershipType: selectedMember.membershipType
                });
                setShowAddModal(true);
              }}>
                <FiEdit2 /> Edit Details
              </button>
              {selectedMember.status === 'approved' ? (
                <button className="btn-danger" onClick={handleDeactivate}>
                  Deactivate
                </button>
              ) : (
                <button className="btn-success" onClick={handleReactivate}>
                  Reactivate
                </button>
              )}
            </div>

            <div className="tabs">
              <button
                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                Borrowing History
              </button>
              <button
                className={`tab ${activeTab === 'fees' ? 'active' : ''}`}
                onClick={() => setActiveTab('fees')}
              >
                Fees & Fines
              </button>
            </div>

            {activeTab === 'details' && (
              <div className="tab-content">
                <div className="detail-item">
                  <label>Email Address</label>
                  <p>{selectedMember.email}</p>
                </div>
                <div className="detail-item">
                  <label>Phone Number</label>
                  <p>{selectedMember.phone || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Address</label>
                  <p>{selectedMember.address || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Membership Expiration</label>
                  <p>{selectedMember.membershipExpiration ? new Date(selectedMember.membershipExpiration).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="tab-content">
                {borrowingHistory.length === 0 ? (
                  <p className="no-data">No borrowing history</p>
                ) : (
                  <div className="history-list">
                    {borrowingHistory.map(loan => (
                      <div key={loan.loanID} className="history-item">
                        <div>
                          <strong>{loan.title}</strong>
                          <p>by {loan.author}</p>
                        </div>
                        <div>
                          <p>Borrowed: {new Date(loan.borrowDate).toLocaleDateString()}</p>
                          {loan.returnDate && (
                            <p>Returned: {new Date(loan.returnDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="tab-content">
                {feeSummary && (
                  <div className="fee-summary">
                    <div className="summary-card">
                      <h4>Total Fees</h4>
                      <p className="summary-value">${feeSummary.totalAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="summary-card pending">
                      <h4>Pending</h4>
                      <p className="summary-value">${feeSummary.pendingAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="summary-card paid">
                      <h4>Paid</h4>
                      <p className="summary-value">${feeSummary.paidAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                )}

                <div className="fees-header">
                  <h3>Fees & Fines</h3>
                  <button className="btn-primary btn-small" onClick={() => setShowAddFeeModal(true)}>
                    <FiPlus /> Add Fee
                  </button>
                </div>

                {fees.length === 0 ? (
                  <p className="no-data">No fees or fines</p>
                ) : (
                  <div className="fees-list">
                    {fees.map(fee => (
                      <div key={fee.fineID} className="fee-item">
                        <div className="fee-info">
                          <div>
                            <strong>{fee.title || 'Manual Fee'}</strong>
                            {fee.title && <p>by {fee.author}</p>}
                            <p className="fee-date">
                              Created: {new Date(fee.createdAt).toLocaleDateString()}
                              {fee.paidAt && ` • Paid: ${new Date(fee.paidAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="fee-amount">
                            <span className={`amount ${fee.status === 'paid' ? 'paid' : 'pending'}`}>
                              ${fee.amount.toFixed(2)}
                            </span>
                            <span className={`status-badge ${fee.status === 'paid' ? 'status-active' : 'status-expired'}`}>
                              {fee.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="fee-actions">
                          {fee.status === 'pending' && (
                            <button 
                              className="btn-success btn-small"
                              onClick={() => handlePayFee(fee.fineID, fee.amount)}
                            >
                              <FiCheck /> Pay Fee
                            </button>
                          )}
                          <button 
                            className="btn-danger btn-small"
                            onClick={() => handleDeleteFee(fee.fineID)}
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Membership Type</label>
                <select
                  name="membershipType"
                  value={formData.membershipType}
                  onChange={handleInputChange}
                >
                  <option value="Adult">Adult</option>
                  <option value="Student">Student</option>
                  <option value="Child">Child</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Modal */}
      {showAddFeeModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowAddFeeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Fee for {selectedMember.firstName} {selectedMember.lastName}</h2>
              <button className="close-btn" onClick={() => setShowAddFeeModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={feeFormData.amount}
                  onChange={(e) => setFeeFormData({ ...feeFormData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={feeFormData.description}
                  onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
                  placeholder="e.g., Late return fee, Lost book fee"
                />
              </div>
              <div className="form-group">
                <label>Related Loan ID (Optional)</label>
                <input
                  type="number"
                  value={feeFormData.loanID}
                  onChange={(e) => setFeeFormData({ ...feeFormData, loanID: e.target.value })}
                  placeholder="Leave empty for manual fee"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowAddFeeModal(false);
                setFeeFormData({ amount: '', description: '', loanID: '' });
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddFee}>
                Add Fee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;

