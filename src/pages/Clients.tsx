import { useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
} from '@/components/ui';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { formatDate } from '@/utils/format';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

const mockClients = [
  { id: '1', name: 'Acme Corp', email: 'billing@acme.com', phone: '+1 234 567 890', createdAt: '2024-01-15' },
  { id: '2', name: 'TechStart Inc', email: 'finance@techstart.io', phone: '+1 234 567 891', createdAt: '2024-02-20' },
  { id: '3', name: 'Design Studio', email: 'accounts@designstudio.com', phone: '+1 234 567 892', createdAt: '2024-03-10' },
  { id: '4', name: 'Marketing Pro', email: 'billing@marketingpro.net', phone: '+1 234 567 893', createdAt: '2024-04-05' },
];

export const Clients = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useClients();
  const { mutate: createClient, isPending } = useCreateClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const clients = data?.data || mockClients;

  const onSubmit = (formData: ClientFormData) => {
    createClient(formData, {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">Manage your client information</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Button>
        </div>

        <Card variant="bordered">
          <CardContent className="p-4">
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-500">Loading clients...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length > 0 ? (
                    clients
                      .filter(
                        (client) =>
                          client.name.toLowerCase().includes(search.toLowerCase()) ||
                          client.email.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((client) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-600 font-medium">
                                  {client.name.charAt(0)}
                                </span>
                              </div>
                              <span className="font-medium text-gray-900">{client.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{client.email}</TableCell>
                          <TableCell className="text-gray-600">{client.phone || '-'}</TableCell>
                          <TableCell className="text-gray-600">
                            {formatDate(client.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="text-lg font-medium">No clients found</p>
                          <p className="mt-1">Add your first client to get started</p>
                          <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                            Add Client
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Client"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Client Name"
            placeholder="Enter client name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="client@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone (Optional)"
            placeholder="+1 234 567 890"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Add Client
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};
